import { Injectable } from '@nestjs/common';
import {
  type Character,
  type CharacterSheet,
  type CharacterSummary,
  deriveStats,
  type DerivedStats,
  emptySheet,
  type EditionId,
  evaluateSheet,
  getRuleset,
  isEditionId,
  parseCharacterSheet,
  type Ruleset,
  type SheetEvaluation,
} from '@vampiro/shared';
import { ApiException, RuleViolationException } from '../../common/api-exception.js';
import { isUuid } from '../../common/validators.js';
import type { Character as CharacterRow, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateCharacterDto,
  EvaluateCharacterDto,
  UpdateCharacterDto,
} from './dto/character.dto.js';

export interface CharacterEvaluation extends SheetEvaluation {
  derived?: DerivedStats;
}

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, edition?: EditionId): Promise<CharacterSummary[]> {
    const rows = await this.prisma.character.findMany({
      where: { ownerId, ...(edition ? { edition } : {}) },
      orderBy: { updatedAt: 'desc' },
      omit: { sheet: true },
    });
    return rows.map((row) => toSummary(row));
  }

  async create(ownerId: string, dto: CreateCharacterDto): Promise<Character> {
    const ruleset = availableRuleset(dto.edition);
    const row = await this.prisma.character.create({
      data: {
        ownerId,
        edition: dto.edition,
        rulesetVersion: ruleset.version,
        name: dto.name,
        concept: dto.concept ?? '',
        sheet: toJson(emptySheet()),
      },
    });
    return toCharacter(row);
  }

  async get(ownerId: string, id: string): Promise<Character> {
    return toCharacter(await this.findOwned(ownerId, id));
  }

  /**
   * Guarda nombre, concepto y ficha. Valida con el motor (en modo `complete` si la ficha ya
   * estaba completa) y usa `updatedAt` como versión: si otra petición guardó antes, 409.
   */
  async update(ownerId: string, id: string, dto: UpdateCharacterDto): Promise<Character> {
    const current = await this.findOwned(ownerId, id);
    const ruleset = availableRuleset(current.edition);
    assertValid(evaluateSheet(dto.sheet, ruleset, { mode: current.status }));

    const { count } = await this.prisma.character.updateMany({
      where: { id, ownerId, updatedAt: new Date(dto.updatedAt) },
      data: {
        name: dto.name,
        concept: dto.concept,
        clan: dto.sheet.clan || null,
        sheet: toJson(dto.sheet),
        rulesetVersion: ruleset.version,
        updatedAt: new Date(),
      },
    });
    if (count === 0) {
      throw new ApiException(
        409,
        'CONFLICTO_VERSION',
        'La ficha se guardó desde otro sitio mientras la editabas. Recárgala para ver la versión actual.',
      );
    }
    return this.get(ownerId, id);
  }

  async evaluate(
    ownerId: string,
    id: string,
    dto: EvaluateCharacterDto,
  ): Promise<CharacterEvaluation> {
    const current = await this.findOwned(ownerId, id);
    const ruleset = availableRuleset(current.edition);
    const sheet = dto.sheet ?? readSheet(current);
    return {
      ...evaluateSheet(sheet, ruleset, { mode: dto.mode ?? current.status }),
      derived: deriveStats(sheet, ruleset),
    };
  }

  async complete(ownerId: string, id: string): Promise<Character> {
    const current = await this.findOwned(ownerId, id);
    const ruleset = availableRuleset(current.edition);
    assertValid(evaluateSheet(readSheet(current), ruleset, { mode: 'complete' }));
    const row = await this.prisma.character.update({
      where: { id },
      data: { status: 'complete', rulesetVersion: ruleset.version },
    });
    return toCharacter(row);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    if (!isUuid(id)) throw notFound();
    const { count } = await this.prisma.character.deleteMany({ where: { id, ownerId } });
    if (count === 0) throw notFound();
  }

  private async findOwned(ownerId: string, id: string): Promise<CharacterRow> {
    if (!isUuid(id)) throw notFound();
    // La ficha de otro usuario responde igual que una inexistente: no se revela que existe.
    const row = await this.prisma.character.findFirst({ where: { id, ownerId } });
    if (!row) throw notFound();
    return row;
  }
}

function availableRuleset(edition: string): Ruleset {
  const ruleset = isEditionId(edition) ? getRuleset(edition) : undefined;
  if (!ruleset) {
    throw new ApiException(
      422,
      'EDICION_NO_DISPONIBLE',
      'Esa edición todavía no tiene reglas cargadas.',
    );
  }
  return ruleset;
}

function assertValid(evaluation: SheetEvaluation): void {
  const errors = evaluation.violations.filter((v) => v.severity === 'error');
  if (errors.length > 0) throw new RuleViolationException(errors);
}

function readSheet(row: CharacterRow): CharacterSheet {
  const parsed = parseCharacterSheet(row.sheet);
  if (!parsed.ok)
    throw new Error(`Ficha ${row.id} corrupta en la base: ${parsed.errors.join('; ')}`);
  return parsed.sheet;
}

/** Copia sin `undefined` (JSONB no los admite). */
function toJson(sheet: CharacterSheet): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(sheet)) as Prisma.InputJsonObject;
}

const notFound = () => new ApiException(404, 'NO_ENCONTRADO', 'No existe esa ficha.');

function toSummary(row: Omit<CharacterRow, 'sheet'>): CharacterSummary {
  return {
    id: row.id,
    edition: row.edition as EditionId,
    name: row.name,
    concept: row.concept,
    ...(row.clan ? { clan: row.clan } : {}),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCharacter(row: CharacterRow): Character {
  return {
    ...toSummary(row),
    ownerId: row.ownerId,
    rulesetVersion: row.rulesetVersion,
    sheet: readSheet(row),
  };
}
