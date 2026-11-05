import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { authResponse } from '../../../testing/fixtures';
import { SessionStore } from '../auth/session-store';
import { RoomSocket, SOCKET_FACTORY, type SocketLike } from './room-socket';

/** Socket falso: guarda los manejadores y permite simular eventos del servidor. */
class FakeSocket implements SocketLike {
  handlers = new Map<string, ((...args: never[]) => void)[]>();
  emitted: { event: string; payload: unknown }[] = [];
  connected = false;
  connectCalls = 0;
  auth: unknown;

  on(event: string, handler: (...args: never[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }
  emit(event: string, payload: unknown, ack?: (r: { ok: boolean }) => void) {
    this.emitted.push({ event, payload });
    ack?.({ ok: true });
    return this;
  }
  connect() {
    this.connectCalls++;
    return this;
  }
  disconnect() {
    this.connected = false;
    return this;
  }
  fire(event: string, ...args: unknown[]) {
    for (const h of this.handlers.get(event) ?? []) (h as (...a: unknown[]) => void)(...args);
  }
}

describe('RoomSocket', () => {
  let fake: FakeSocket;
  let socket: RoomSocket;
  let http: HttpTestingController;

  beforeEach(async () => {
    fake = new FakeSocket();
    TestBed.configureTestingModule({
      providers: [
        RoomSocket,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SOCKET_FACTORY,
          useValue: (auth: unknown) => {
            fake.auth = auth;
            return fake;
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const session = TestBed.inject(SessionStore);
    const login = firstValueFrom(session.login({ email: 'a@b.c', password: 'x' }));
    http.expectOne('/api/v1/auth/login').flush(authResponse('token-1'));
    await login;
    socket = TestBed.inject(RoomSocket);
  });

  afterEach(() => http.verify());

  it('envía el token actual al conectar y entra en la sala', () => {
    socket.connect('r1', { onEvent: () => undefined, onResync: () => undefined });
    let token: unknown;
    (fake.auth as (cb: (data: unknown) => void) => void)((data) => (token = data));
    expect(token).toEqual({ token: 'token-1' });

    fake.fire('connect');
    expect(fake.emitted).toEqual([{ event: 'room.join', payload: { roomId: 'r1' } }]);
    expect(socket.status()).toBe('connected');
  });

  it('reenvía los eventos de la sala', () => {
    const events: [string, unknown][] = [];
    socket.connect('r1', { onEvent: (e, p) => events.push([e, p]), onResync: () => undefined });
    fake.fire('roll.created', { id: 'x' });
    fake.fire('room.config.updated', { extraFreebies: 2 });
    expect(events).toEqual([
      ['roll.created', { id: 'x' }],
      ['room.config.updated', { extraFreebies: 2 }],
    ]);
  });

  it('al reconectar vuelve a entrar en la sala y pide resincronizar', () => {
    let resyncs = 0;
    socket.connect('r1', { onEvent: () => undefined, onResync: () => resyncs++ });
    fake.fire('connect');
    fake.fire('disconnect', 'transport close');
    expect(socket.status()).toBe('reconnecting');
    fake.fire('connect');
    expect(fake.emitted.filter((e) => e.event === 'room.join')).toHaveLength(2);
    expect(resyncs).toBe(1);
  });

  it('si el token caducó, lo renueva y vuelve a conectar', async () => {
    socket.connect('r1', { onEvent: () => undefined, onResync: () => undefined });
    fake.fire('connect_error', new Error('NO_AUTENTICADO'));
    http.expectOne('/api/v1/auth/refresh').flush(authResponse('token-2'));
    await Promise.resolve();
    await Promise.resolve();
    expect(fake.connectCalls).toBe(1);
  });
});
