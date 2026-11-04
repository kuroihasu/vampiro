import { Injectable } from '@nestjs/common';
import {
  evaluateSheet,
  getRuleset,
  isEditionId,
  parseCharacterSheet,
  parseRoomConfig,
  type RoomConfig,
  type RuleViolation,
} from '@vampiro/shared';
import type { Character } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface Compliance {
  compliant: boolean;
  violations: RuleViolation[];
}

/**
 * Decide si una ficha cumple en una sala: reglas de su edición en modo `complete`
 * más la configuración del master (con las reglas de NPC si lo es).
 */
@Injectable()
export class RoomComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  evaluate(
    character: Pick<Character, 'edition' | 'sheet'>,
    config: RoomConfig,
    isNpc: boolean,
  ): Compliance {
    const ruleset = isEditionId(character.edition) ? getRuleset(character.edition) : undefined;
    const sheet = parseCharacterSheet(character.sheet);
    if (!ruleset || !sheet.ok) {
      return {
        compliant: false,
        violations: [
          {
            code: 'REQUISITO_NO_CUMPLIDO',
            severity: 'error',
            message: 'No se pudo evaluar la ficha con las reglas de su edición.',
          },
        ],
      };
    }
    const violations = evaluateSheet(sheet.sheet, ruleset, {
      mode: 'complete',
      roomConfig: config,
      isNpc,
    }).violations.filter((v) => v.severity === 'error');
    return { compliant: violations.length === 0, violations };
  }

  /** Recalcula `compliant` de todas las fichas de una sala (tras cambiar la config). */
  async recheckRoom(roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { characters: { include: { character: true } } },
    });
    if (!room) return;
    const config = readConfig(room.config);
    await this.prisma.$transaction(
      room.characters.map((link) =>
        this.prisma.roomCharacter.update({
          where: { id: link.id },
          data: { compliant: this.evaluate(link.character, config, link.isNpc).compliant },
        }),
      ),
    );
  }

  /** Recalcula `compliant` de una ficha en todas sus salas (tras guardarla). */
  async recheckCharacter(characterId: string): Promise<void> {
    const links = await this.prisma.roomCharacter.findMany({
      where: { characterId },
      include: { character: true, room: true },
    });
    await this.prisma.$transaction(
      links.map((link) =>
        this.prisma.roomCharacter.update({
          where: { id: link.id },
          data: {
            compliant: this.evaluate(link.character, readConfig(link.room.config), link.isNpc)
              .compliant,
          },
        }),
      ),
    );
  }
}

export function readConfig(value: unknown): RoomConfig {
  const parsed = parseRoomConfig(value);
  if (!parsed.ok) throw new Error(`Configuración de sala corrupta: ${parsed.errors.join('; ')}`);
  return parsed.config;
}
