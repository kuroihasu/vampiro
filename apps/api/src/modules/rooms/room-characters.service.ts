import { Injectable } from '@nestjs/common';
import {
  type CharacterState,
  deriveStats,
  getRuleset,
  isEditionId,
  parseCharacterSheet,
  type RoomCharacterInfo,
  type RoomConfig,
} from '@vampiro/shared';
import { ApiException } from '../../common/api-exception.js';
import { isUuid } from '../../common/validators.js';
import {
  type Character,
  Prisma,
  type RoomCharacter,
  type User,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RoomEventsService } from '../realtime/room-events.service.js';
import type {
  CharacterStateDto,
  LinkCharacterDto,
  UpdateRoomCharacterDto,
} from './dto/room.dto.js';
import { onlyMaster, type RoomMembership } from './room-access.guard.js';
import { readConfig, RoomComplianceService } from './room-compliance.service.js';

export type LinkRow = RoomCharacter & { character: Character; controller: User };

/** Fichas llevadas a una sala: vincular, cambiar tipo (PJ/NPC), estado en partida y retirar. */
@Injectable()
export class RoomCharactersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: RoomComplianceService,
    private readonly events: RoomEventsService,
  ) {}

  async link(actor: RoomMembership, dto: LinkCharacterDto): Promise<RoomCharacterInfo> {
    const isNpc = dto.isNpc ?? false;
    if (isNpc && actor.role !== 'master') throw onlyMaster();

    const [room, character] = await Promise.all([
      this.prisma.room.findUniqueOrThrow({ where: { id: actor.roomId } }),
      this.prisma.character.findFirst({ where: { id: dto.characterId, ownerId: actor.userId } }),
    ]);
    if (!character) throw new ApiException(404, 'NO_ENCONTRADO', 'No existe esa ficha.');
    if (character.edition !== room.edition) {
      throw new ApiException(
        422,
        'EDICION_INCOMPATIBLE',
        'La ficha es de otra edición que la sala.',
      );
    }

    const config = readConfig(room.config);
    const { compliant } = this.compliance.evaluate(character, config, isNpc);
    try {
      const link = await this.prisma.roomCharacter.create({
        data: {
          roomId: room.id,
          characterId: character.id,
          controlledBy: actor.userId,
          isNpc,
          compliant,
        },
        include: { character: true, controller: true },
      });
      const info = toRoomCharacterInfo(link, this.compliance, config);
      this.events.emit(actor.roomId, 'character.linked', info);
      return info;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(409, 'FICHA_YA_VINCULADA', 'Esa ficha ya está en la sala.');
      }
      throw error;
    }
  }

  async update(
    actor: RoomMembership,
    linkId: string,
    dto: UpdateRoomCharacterDto,
  ): Promise<RoomCharacterInfo> {
    const current = await this.findLink(actor.roomId, linkId);
    const config = await this.roomConfig(actor.roomId);
    const isNpc = dto.isNpc ?? current.isNpc;
    const link = await this.prisma.roomCharacter.update({
      where: { id: current.id },
      data: {
        isNpc,
        compliant: this.compliance.evaluate(current.character, config, isNpc).compliant,
      },
      include: { character: true, controller: true },
    });
    return this.updated(actor.roomId, link, config);
  }

  /**
   * Estado en partida (salud, voluntad, sangre, notas). Lo cambia el master o quien
   * controla la ficha; Voluntad y sangre no pueden pasar de los máximos de la ficha.
   */
  async updateState(
    actor: RoomMembership,
    linkId: string,
    dto: CharacterStateDto,
  ): Promise<RoomCharacterInfo> {
    const current = await this.findLink(actor.roomId, linkId);
    if (actor.role !== 'master' && current.controlledBy !== actor.userId) {
      throw new ApiException(
        403,
        'PROHIBIDO',
        'Solo el master o quien controla la ficha puede cambiar su estado.',
      );
    }
    const derived = derivedOf(current.character);
    const errors: string[] = [];
    if (derived && dto.willpowerSpent !== undefined && dto.willpowerSpent > derived.willpower) {
      errors.push(`willpowerSpent no puede pasar de ${derived.willpower}`);
    }
    if (derived && dto.blood !== undefined && dto.blood > derived.bloodPoolMax) {
      errors.push(`blood no puede pasar de ${derived.bloodPoolMax}`);
    }
    if (errors.length) throw new ApiException(400, 'VALIDATION_ERROR', errors.join('; '));

    const changes: Partial<CharacterState> = {
      ...(dto.damage !== undefined ? { damage: dto.damage } : {}),
      ...(dto.willpowerSpent !== undefined ? { willpowerSpent: dto.willpowerSpent } : {}),
      ...(dto.blood !== undefined ? { blood: dto.blood } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    };
    const state: Partial<CharacterState> = {
      ...((current.state ?? {}) as Partial<CharacterState>),
      ...changes,
    };
    const link = await this.prisma.roomCharacter.update({
      where: { id: current.id },
      data: { state: JSON.parse(JSON.stringify(state)) as Prisma.InputJsonObject },
      include: { character: true, controller: true },
    });
    return this.updated(actor.roomId, link, await this.roomConfig(actor.roomId));
  }

  /** La retira el master o quien la controla. */
  async unlink(actor: RoomMembership, linkId: string): Promise<void> {
    const link = await this.findLink(actor.roomId, linkId);
    if (actor.role !== 'master' && link.controlledBy !== actor.userId) {
      throw new ApiException(
        403,
        'PROHIBIDO',
        'Solo el master o quien controla la ficha puede retirarla.',
      );
    }
    await this.prisma.roomCharacter.delete({ where: { id: link.id } });
    this.events.emit(actor.roomId, 'character.unlinked', { id: link.id });
  }

  /** Busca una ficha de la sala (para tirar dados con ella). */
  async findLink(roomId: string, linkId: string): Promise<LinkRow> {
    if (!isUuid(linkId)) throw linkNotFound();
    const link = await this.prisma.roomCharacter.findFirst({
      where: { id: linkId, roomId },
      include: { character: true, controller: true },
    });
    if (!link) throw linkNotFound();
    return link;
  }

  private updated(roomId: string, link: LinkRow, config: RoomConfig): RoomCharacterInfo {
    const info = toRoomCharacterInfo(link, this.compliance, config);
    this.events.emit(roomId, 'character.updated', info);
    return info;
  }

  private async roomConfig(roomId: string): Promise<RoomConfig> {
    return readConfig((await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } })).config);
  }
}

const linkNotFound = () => new ApiException(404, 'NO_ENCONTRADO', 'Esa ficha no está en la sala.');

function derivedOf(character: Character) {
  const ruleset = isEditionId(character.edition) ? getRuleset(character.edition) : undefined;
  const sheet = parseCharacterSheet(character.sheet);
  return ruleset && sheet.ok ? deriveStats(sheet.sheet, ruleset) : undefined;
}

export function toRoomCharacterInfo(
  link: LinkRow,
  compliance: RoomComplianceService,
  config: RoomConfig,
): RoomCharacterInfo {
  const { violations } = compliance.evaluate(link.character, config, link.isNpc);
  const derived = derivedOf(link.character);
  return {
    id: link.id,
    characterId: link.characterId,
    name: link.character.name,
    ...(link.character.clan ? { clan: link.character.clan } : {}),
    status: link.character.status,
    controlledBy: link.controlledBy,
    controllerName: link.controller.displayName,
    isNpc: link.isNpc,
    compliant: link.compliant,
    violations,
    state: (link.state ?? {}) as Partial<CharacterState>,
    ...(derived ? { derived } : {}),
  };
}
