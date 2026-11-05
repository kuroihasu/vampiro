import { Injectable } from '@nestjs/common';
import type { CharacterState, RoomCharacterInfo, RoomConfig } from '@vampiro/shared';
import { ApiException } from '../../common/api-exception.js';
import { isUuid } from '../../common/validators.js';
import {
  type Character,
  Prisma,
  type RoomCharacter,
  type User,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { LinkCharacterDto, UpdateRoomCharacterDto } from './dto/room.dto.js';
import { onlyMaster, type RoomMembership } from './room-access.guard.js';
import { readConfig, RoomComplianceService } from './room-compliance.service.js';

type LinkRow = RoomCharacter & { character: Character; controller: User };

/** Fichas llevadas a una sala: vincular, cambiar tipo (PJ/NPC) y retirar. */
@Injectable()
export class RoomCharactersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: RoomComplianceService,
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
      return toRoomCharacterInfo(link, this.compliance, config);
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
    const config = readConfig(
      (await this.prisma.room.findUniqueOrThrow({ where: { id: actor.roomId } })).config,
    );
    const isNpc = dto.isNpc ?? current.isNpc;
    const link = await this.prisma.roomCharacter.update({
      where: { id: current.id },
      data: {
        isNpc,
        compliant: this.compliance.evaluate(current.character, config, isNpc).compliant,
      },
      include: { character: true, controller: true },
    });
    return toRoomCharacterInfo(link, this.compliance, config);
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
  }

  private async findLink(roomId: string, linkId: string): Promise<LinkRow> {
    if (!isUuid(linkId)) throw linkNotFound();
    const link = await this.prisma.roomCharacter.findFirst({
      where: { id: linkId, roomId },
      include: { character: true, controller: true },
    });
    if (!link) throw linkNotFound();
    return link;
  }
}

const linkNotFound = () => new ApiException(404, 'NO_ENCONTRADO', 'Esa ficha no está en la sala.');

export function toRoomCharacterInfo(
  link: LinkRow,
  compliance: RoomComplianceService,
  config: RoomConfig,
): RoomCharacterInfo {
  const { violations } = compliance.evaluate(link.character, config, link.isNpc);
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
  };
}
