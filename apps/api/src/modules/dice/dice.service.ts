import { BadRequestException, Injectable } from '@nestjs/common';
import {
  calculateDicePool,
  type DicePool,
  type DiceRollRecord,
  findTrait,
  getRuleset,
  isEditionId,
  MAX_DICE,
  parseCharacterSheet,
  type RollResult,
  type RollsPage,
  type Ruleset,
  resolveRoll,
} from '@vampiro/shared';
import { randomInt } from 'node:crypto';
import { ApiException } from '../../common/api-exception.js';
import type { DiceRoll, Prisma, User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RoomEventsService } from '../realtime/room-events.service.js';
import type { RoomMembership } from '../rooms/room-access.guard.js';
import { RoomCharactersService } from '../rooms/room-characters.service.js';
import { readConfig } from '../rooms/room-compliance.service.js';
import type { DicePoolDto, RollDto } from './dto/dice.dto.js';

const DEFAULT_PAGE = 20;
const MAX_PAGE = 100;

interface PreparedPool {
  pool: DicePool;
  ruleset: Ruleset;
  label: string;
  roomCharacterId?: string;
  characterName?: string;
}

/** Reservas y tiradas. Los dados se tiran en el servidor con un RNG criptográfico. */
@Injectable()
export class DiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomCharacters: RoomCharactersService,
    private readonly events: RoomEventsService,
  ) {}

  async pool(actor: RoomMembership, dto: DicePoolDto): Promise<DicePool> {
    return (await this.prepare(actor, dto)).pool;
  }

  async roll(actor: RoomMembership, dto: RollDto): Promise<DiceRollRecord> {
    const prepared = await this.prepare(actor, dto);
    const { pool, ruleset } = prepared;
    const hunger = pool.hungerDice ?? 0;
    const result: RollResult = resolveRoll(ruleset.dice, {
      dice: rollD10(pool.dice - hunger),
      ...(hunger > 0 ? { hungerDice: rollD10(hunger) } : {}),
      ...(pool.difficulty !== undefined ? { difficulty: pool.difficulty } : {}),
    });
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: actor.roomId } });

    const row = await this.prisma.diceRoll.create({
      data: {
        roomId: actor.roomId,
        userId: actor.userId,
        roomCharacterId: prepared.roomCharacterId ?? null,
        characterName: prepared.characterName ?? null,
        label: dto.label || prepared.label,
        pool: toJson(pool),
        result: toJson(result),
        visibility: readConfig(room.config).diceVisibility,
      },
      include: { user: true },
    });
    const record = toRecord(row);
    this.events.roll(record);
    return record;
  }

  /**
   * Historial de la más nueva a la más antigua. Con visibilidad "solo master", un jugador
   * solo ve sus propias tiradas. El cursor es opaco (fecha + id de la última recibida).
   */
  async list(actor: RoomMembership, cursor?: string, limit?: number): Promise<RollsPage> {
    const take = Math.min(MAX_PAGE, Math.max(1, limit ?? DEFAULT_PAGE));
    const where: Prisma.DiceRollWhereInput = { roomId: actor.roomId };
    if (actor.role !== 'master') {
      where.OR = [{ visibility: 'all' }, { userId: actor.userId }];
    }
    const after = cursor ? decodeCursor(cursor) : undefined;
    const rows = await this.prisma.diceRoll.findMany({
      where: after
        ? {
            AND: [
              where,
              {
                OR: [
                  { createdAt: { lt: after.createdAt } },
                  { createdAt: after.createdAt, id: { lt: after.id } },
                ],
              },
            ],
          }
        : where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      include: { user: true },
    });
    const items = rows.slice(0, take).map(toRecord);
    const last = rows.length > take ? rows[take - 1] : undefined;
    return { items, ...(last ? { nextCursor: encodeCursor(last) } : {}) };
  }

  private async prepare(actor: RoomMembership, dto: DicePoolDto): Promise<PreparedPool> {
    if (!dto.roomCharacterId) return this.freePool(actor, dto);

    const link = await this.roomCharacters.findLink(actor.roomId, dto.roomCharacterId);
    if (actor.role !== 'master' && link.controlledBy !== actor.userId) {
      throw new ApiException(403, 'PROHIBIDO', 'Solo puedes tirar con tus personajes.');
    }
    const ruleset = rulesetFor(link.character.edition);
    const sheet = parseCharacterSheet(link.character.sheet);
    if (!sheet.ok) throw new Error(`Ficha ${link.characterId} corrupta`);

    let traits = dto.traits ?? [];
    if (dto.actionKey) {
      const action = ruleset.actions.find((a) => a.key === dto.actionKey);
      if (!action) throw invalid(`La acción "${dto.actionKey}" no existe en esta edición.`);
      traits = action.traits;
    }
    if (traits.length === 0) throw invalid('Elige una acción o los rasgos que se suman.');
    const unknown = traits.filter((k) => !findTrait(ruleset, k));
    if (unknown.length) throw invalid(`Rasgos desconocidos: ${unknown.join(', ')}.`);

    // V5: los dados de Hambre salen del estado del personaje en la sala (1 si aún no hay).
    const state = (link.state ?? {}) as { hunger?: number };
    const hunger = usesHunger(ruleset) ? (state.hunger ?? 1) : undefined;
    const pool = calculateDicePool(sheet.sheet, ruleset, {
      traits,
      ...(hunger !== undefined ? { hunger } : {}),
      ...(dto.modifier !== undefined ? { modifier: dto.modifier } : {}),
      ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
    });
    if (pool.dice > MAX_DICE) throw invalid(`Como mucho se tiran ${MAX_DICE} dados.`);
    const names = traits.map((k) => findTrait(ruleset, k)?.name ?? k).join(' + ');
    return {
      pool,
      ruleset,
      label: dto.modifier
        ? `${names} ${dto.modifier > 0 ? '+' : '−'} ${Math.abs(dto.modifier)}`
        : names,
      roomCharacterId: link.id,
      characterName: link.character.name,
    };
  }

  private async freePool(actor: RoomMembership, dto: DicePoolDto): Promise<PreparedPool> {
    if (!dto.dice) throw invalid('Indica cuántos dados tirar o elige un personaje.');
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: actor.roomId } });
    const ruleset = rulesetFor(room.edition);
    const dice = Math.max(0, Math.min(MAX_DICE, dto.dice + (dto.modifier ?? 0)));
    const breakdown = [{ source: 'Dados', dice: dto.dice }];
    if (dto.modifier) breakdown.push({ source: 'Modificador', dice: dto.modifier });
    const difficulty =
      ruleset.dice.kind === 'difficulty'
        ? Math.min(
            ruleset.dice.maxDifficulty,
            Math.max(ruleset.dice.minDifficulty, dto.difficulty ?? 6),
          )
        : undefined;
    const hungerDice = usesHunger(ruleset) ? Math.min(dice, dto.hunger ?? 0) : undefined;
    return {
      pool: {
        dice,
        breakdown,
        ...(difficulty !== undefined ? { difficulty } : {}),
        ...(hungerDice !== undefined ? { hungerDice } : {}),
      },
      ruleset,
      label: `Tirada libre de ${dice} ${dice === 1 ? 'dado' : 'dados'}`,
    };
  }
}

function usesHunger(ruleset: Ruleset): boolean {
  return ruleset.dice.kind === 'success-threshold' && ruleset.dice.hungerDice;
}

function rollD10(count: number): number[] {
  return Array.from({ length: Math.max(0, count) }, () => randomInt(1, 11));
}

function rulesetFor(edition: string): Ruleset {
  const ruleset = isEditionId(edition) ? getRuleset(edition) : undefined;
  if (!ruleset)
    throw new ApiException(422, 'EDICION_NO_DISPONIBLE', 'Esa edición no tiene reglas cargadas.');
  return ruleset;
}

const invalid = (message: string) => new BadRequestException({ message: [message] });

function toJson(value: object): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function encodeCursor(row: DiceRoll): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const createdAt = new Date(iso ?? '');
  if (!id || Number.isNaN(createdAt.getTime())) throw invalid('El cursor no es válido.');
  return { createdAt, id };
}

function toRecord(row: DiceRoll & { user: User }): DiceRollRecord {
  return {
    id: row.id,
    roomId: row.roomId,
    userId: row.userId,
    userName: row.user.displayName,
    ...(row.roomCharacterId ? { roomCharacterId: row.roomCharacterId } : {}),
    ...(row.characterName ? { characterName: row.characterName } : {}),
    label: row.label,
    pool: row.pool as unknown as DicePool,
    result: row.result as unknown as RollResult,
    visibility: row.visibility === 'master-only' ? 'master-only' : 'all',
    createdAt: row.createdAt.toISOString(),
  };
}
