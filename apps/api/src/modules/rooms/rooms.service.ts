import { Injectable } from '@nestjs/common';
import {
  DEFAULT_ROOM_CONFIG,
  getRuleset,
  type EditionId,
  type InvitePreview,
  type RoomCharacterInfo,
  type RoomConfig,
  type RoomDetail,
  type RoomSummary,
} from '@vampiro/shared';
import { randomInt } from 'node:crypto';
import { ApiException } from '../../common/api-exception.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RoomEventsService } from '../realtime/room-events.service.js';
import type { CreateRoomDto } from './dto/room.dto.js';
import { onlyMaster, type RoomMembership } from './room-access.guard.js';
import { readConfig, RoomComplianceService } from './room-compliance.service.js';
import { toRoomCharacterInfo } from './room-characters.service.js';

/** Sin 0/O ni 1/I: el código se dicta y se copia a mano. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

const roomDetailInclude = {
  members: { include: { user: true }, orderBy: { joinedAt: 'asc' } },
  characters: {
    include: { character: true, controller: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.RoomInclude;

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: RoomComplianceService,
    private readonly events: RoomEventsService,
  ) {}

  async create(userId: string, dto: CreateRoomDto): Promise<RoomDetail> {
    if (!getRuleset(dto.edition)) {
      throw new ApiException(
        422,
        'EDICION_NO_DISPONIBLE',
        'Esa edición todavía no tiene reglas cargadas.',
      );
    }
    const room = await this.withUniqueCode((inviteCode) =>
      this.prisma.room.create({
        data: {
          name: dto.name,
          edition: dto.edition,
          masterId: userId,
          inviteCode,
          config: toJson(dto.config ?? DEFAULT_ROOM_CONFIG),
          members: { create: { userId, role: 'master' } },
        },
      }),
    );
    return this.detail({ roomId: room.id, userId, role: 'master' });
  }

  async list(userId: string): Promise<RoomSummary[]> {
    const memberships = await this.prisma.roomMember.findMany({
      where: { userId },
      include: { room: { include: { _count: { select: { members: true } } } } },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map(({ room, role }) => ({
      id: room.id,
      name: room.name,
      edition: room.edition as EditionId,
      myRole: role,
      memberCount: room._count.members,
      createdAt: room.createdAt.toISOString(),
    }));
  }

  async detail(membership: RoomMembership): Promise<RoomDetail> {
    const room = await this.prisma.room.findUniqueOrThrow({
      where: { id: membership.roomId },
      include: roomDetailInclude,
    });
    const config = readConfig(room.config);
    const isMaster = membership.role === 'master';
    return {
      id: room.id,
      name: room.name,
      edition: room.edition as EditionId,
      masterId: room.masterId,
      myRole: membership.role,
      config,
      ...(isMaster
        ? {
            invite: {
              code: room.inviteCode,
              ...(room.inviteExpiresAt ? { expiresAt: room.inviteExpiresAt.toISOString() } : {}),
            },
          }
        : {}),
      members: room.members.map((m) => ({
        userId: m.userId,
        displayName: m.user.displayName,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      characters: room.characters.map((link): RoomCharacterInfo =>
        toRoomCharacterInfo(link, this.compliance, config),
      ),
      createdAt: room.createdAt.toISOString(),
    };
  }

  /** Cambia la configuración y re-evalúa todas las fichas vinculadas. */
  async updateConfig(membership: RoomMembership, config: RoomConfig): Promise<RoomDetail> {
    await this.prisma.room.update({
      where: { id: membership.roomId },
      data: { config: toJson(config) },
    });
    await this.compliance.recheckRoom(membership.roomId);
    this.events.emit(membership.roomId, 'room.config.updated', config);
    return this.detail(membership);
  }

  /** Genera un código nuevo (el anterior deja de valer) con caducidad opcional. */
  async regenerateInvite(
    roomId: string,
    expiresInHours?: number,
  ): Promise<{ code: string; expiresAt?: string }> {
    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3_600_000) : null;
    const room = await this.withUniqueCode((inviteCode) =>
      this.prisma.room.update({
        where: { id: roomId },
        data: { inviteCode, inviteExpiresAt: expiresAt },
      }),
    );
    return { code: room.inviteCode, ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}) };
  }

  async previewInvite(code: string, userId?: string): Promise<InvitePreview> {
    const room = await this.findByCode(code);
    const [master, memberCount, membership] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: room.masterId } }),
      this.prisma.roomMember.count({ where: { roomId: room.id } }),
      userId
        ? this.prisma.roomMember.findUnique({
            where: { roomId_userId: { roomId: room.id, userId } },
          })
        : null,
    ]);
    return {
      roomId: room.id,
      roomName: room.name,
      edition: room.edition as EditionId,
      masterName: master.displayName,
      memberCount,
      alreadyMember: !!membership,
    };
  }

  async join(userId: string, code: string): Promise<RoomDetail> {
    const room = await this.findByCode(code);
    try {
      await this.prisma.roomMember.create({ data: { roomId: room.id, userId, role: 'player' } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(409, 'YA_ES_MIEMBRO', 'Ya eres miembro de esta sala.');
      }
      throw error;
    }
    const detail = await this.detail({ roomId: room.id, userId, role: 'player' });
    const me = detail.members.find((m) => m.userId === userId);
    if (me) this.events.emit(room.id, 'member.joined', me);
    return detail;
  }

  /**
   * El master puede sacar a cualquier jugador; un jugador solo puede irse él.
   * El master no puede salir de su sala. Las fichas que controlaba salen con él.
   */
  async removeMember(actor: RoomMembership, targetUserId: string): Promise<void> {
    const target = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: actor.roomId, userId: targetUserId } },
    });
    if (!target) throw new ApiException(404, 'NO_ENCONTRADO', 'Esa persona no está en la sala.');
    if (target.role === 'master') {
      throw new ApiException(403, 'PROHIBIDO', 'El master no puede salir de su propia sala.');
    }
    if (actor.role !== 'master' && actor.userId !== targetUserId) throw onlyMaster();

    await this.prisma.$transaction([
      this.prisma.roomCharacter.deleteMany({
        where: { roomId: actor.roomId, controlledBy: targetUserId },
      }),
      this.prisma.roomMember.delete({
        where: { roomId_userId: { roomId: actor.roomId, userId: targetUserId } },
      }),
    ]);
    this.events.removeUser(actor.roomId, targetUserId);
    this.events.emit(actor.roomId, 'member.left', { userId: targetUserId });
  }

  private async findByCode(code: string) {
    const room = await this.prisma.room.findUnique({
      where: { inviteCode: code.trim().toUpperCase() },
    });
    if (!room)
      throw new ApiException(404, 'INVITACION_INVALIDA', 'Ese código de invitación no existe.');
    if (room.inviteExpiresAt && room.inviteExpiresAt <= new Date()) {
      throw new ApiException(
        410,
        'INVITACION_VENCIDA',
        'La invitación ha caducado. Pide un código nuevo al master.',
      );
    }
    return room;
  }

  /** Reintenta si el código aleatorio ya existe (improbable: 32^8 combinaciones). */
  private async withUniqueCode<T>(write: (code: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await write(newInviteCode());
      } catch (error) {
        const collision =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!collision || attempt >= 4) throw error;
      }
    }
  }
}

function newInviteCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join('');
}

export function toJson(value: object): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
