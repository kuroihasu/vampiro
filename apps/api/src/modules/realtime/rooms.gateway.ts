import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { ROOMS_NAMESPACE, type RoomClientEvents, type RoomServerEvents } from '@vampiro/shared';
import type { Namespace, Socket } from 'socket.io';
import type { AccessTokenPayload } from '../../common/auth/auth-user.js';
import { isUuid } from '../../common/validators.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  mastersChannel,
  RoomEventsService,
  roomChannel,
  userChannel,
} from './room-events.service.js';

interface SocketData {
  userId: string;
}

type RoomSocket = Socket<RoomClientEvents, RoomServerEvents, Record<string, never>, SocketData>;

/**
 * WebSocket de salas (namespace /rooms). Se autentica con el mismo access token JWT que
 * la API (handshake.auth.token). El cliente pide entrar con `room.join`; el servidor solo
 * envía eventos (las escrituras van por REST).
 */
@WebSocketGateway({ namespace: ROOMS_NAMESPACE })
export class RoomsGateway implements OnGatewayInit {
  private readonly logger = new Logger(RoomsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly events: RoomEventsService,
  ) {}

  afterInit(namespace: Namespace<RoomClientEvents, RoomServerEvents>): void {
    this.events.attach(namespace);
    namespace.use((socket, next) => {
      void this.authenticate(socket as RoomSocket)
        .then(() => next())
        .catch(() => next(new Error('NO_AUTENTICADO')));
    });
  }

  @SubscribeMessage('room.join')
  async join(
    @ConnectedSocket() socket: RoomSocket,
    @MessageBody() body: { roomId?: unknown },
  ): Promise<{ ok: boolean; error?: string }> {
    const roomId = body?.roomId;
    if (typeof roomId !== 'string' || !isUuid(roomId)) return { ok: false, error: 'NO_ENCONTRADO' };
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: socket.data.userId } },
    });
    if (!member) return { ok: false, error: 'NO_ENCONTRADO' };
    await socket.join([
      roomChannel(roomId),
      ...(member.role === 'master' ? [mastersChannel(roomId)] : []),
    ]);
    return { ok: true };
  }

  private async authenticate(socket: RoomSocket): Promise<void> {
    const token: unknown = socket.handshake.auth?.['token'];
    if (typeof token !== 'string' || token.length === 0) throw new Error('sin token');
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new Error('usuario inexistente');
    socket.data.userId = user.id;
    await socket.join(userChannel(user.id));
    this.logger.debug(`Socket ${socket.id} conectado (usuario ${user.id})`);
  }
}
