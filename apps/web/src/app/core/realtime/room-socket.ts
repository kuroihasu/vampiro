import { DestroyRef, inject, InjectionToken, Service, signal } from '@angular/core';
import { ROOMS_NAMESPACE, type RoomServerEvents } from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { io } from 'socket.io-client';
import { SessionStore } from '../auth/session-store';

/** Lo mínimo de socket.io-client que usa RoomSocket (permite probarlo con un doble). */
export interface SocketLike {
  on(event: string, handler: (...args: never[]) => void): unknown;
  emit(
    event: string,
    payload: unknown,
    ack?: (result: { ok: boolean; error?: string }) => void,
  ): unknown;
  connect(): unknown;
  disconnect(): unknown;
}

export type SocketAuth = (cb: (data: { token?: string }) => void) => void;

export const SOCKET_FACTORY = new InjectionToken<(auth: SocketAuth) => SocketLike>(
  'SOCKET_FACTORY',
  {
    providedIn: 'root',
    factory: () => (auth) =>
      io(ROOMS_NAMESPACE, { auth, transports: ['websocket'] }) as unknown as SocketLike,
  },
);

export type RoomEventName = keyof RoomServerEvents;
export type SocketStatus = 'idle' | 'connected' | 'reconnecting';

export interface RoomSocketHandlers {
  onEvent: (event: RoomEventName, payload: unknown) => void;
  /** Tras una reconexión: hay que recargar lo que pudo perderse mientras tanto. */
  onResync: () => void;
}

const EVENTS: RoomEventName[] = [
  'member.joined',
  'member.left',
  'character.linked',
  'character.updated',
  'character.unlinked',
  'room.config.updated',
  'roll.created',
];

/**
 * Conexión en tiempo real con una sala. Usa el access token actual en cada (re)conexión;
 * si el servidor lo rechaza por caducado, renueva la sesión y vuelve a conectar.
 * Se provee en el componente de la sala: se desconecta al salir de ella.
 */
@Service({ autoProvided: false })
export class RoomSocket {
  private readonly session = inject(SessionStore);
  private readonly factory = inject(SOCKET_FACTORY);
  private socket?: SocketLike;

  readonly status = signal<SocketStatus>('idle');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  connect(roomId: string, handlers: RoomSocketHandlers): void {
    this.disconnect();
    const socket = this.factory((cb) => cb({ token: this.session.accessToken() }));
    this.socket = socket;
    let connectedBefore = false;
    let refreshing = false;

    socket.on('connect', () => {
      socket.emit('room.join', { roomId });
      this.status.set('connected');
      if (connectedBefore) handlers.onResync();
      connectedBefore = true;
    });
    socket.on('disconnect', (reason: string) => {
      this.status.set('reconnecting');
      // Si fue el servidor quien cerró, socket.io no reintenta solo.
      if (reason === 'io server disconnect') socket.connect();
    });
    socket.on('connect_error', (error: Error) => {
      this.status.set('reconnecting');
      if (error.message !== 'NO_AUTENTICADO' || refreshing) return;
      refreshing = true;
      void firstValueFrom(this.session.refresh())
        .then(() => socket.connect())
        .catch(() => this.status.set('idle'))
        .finally(() => (refreshing = false));
    });
    for (const event of EVENTS) {
      socket.on(event, (payload: never) => handlers.onEvent(event, payload));
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = undefined;
    this.status.set('idle');
  }
}
