import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { AuthResponse, LoginRequest, PublicUser, RegisterRequest } from '@vampiro/shared';
import {
  catchError,
  finalize,
  firstValueFrom,
  map,
  type Observable,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';

const AUTH_URL = '/api/v1/auth';

interface Session {
  user: PublicUser;
  accessToken: string;
}

/**
 * Estado de la sesión. El access token vive solo en memoria; el refresh token va en una
 * cookie httpOnly que el navegador envía a /api/v1/auth, así que JS nunca lo ve.
 */
@Service()
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly session = signal<Session | undefined>(undefined);
  private refreshInFlight?: Observable<AuthResponse>;

  readonly user = computed(() => this.session()?.user);
  readonly isAuthenticated = computed(() => this.session() !== undefined);

  accessToken(): string | undefined {
    return this.session()?.accessToken;
  }

  login(request: LoginRequest): Observable<PublicUser> {
    return this.authenticate('login', request);
  }

  register(request: RegisterRequest): Observable<PublicUser> {
    return this.authenticate('register', request);
  }

  /** Renueva el access token. Las llamadas simultáneas comparten una sola petición. */
  refresh(): Observable<AuthResponse> {
    this.refreshInFlight ??= this.http
      .post<AuthResponse>(`${AUTH_URL}/refresh`, null, { withCredentials: true })
      .pipe(
        tap((res) => this.start(res)),
        catchError((error: unknown) => {
          this.session.set(undefined);
          return throwError(() => error);
        }),
        finalize(() => (this.refreshInFlight = undefined)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshInFlight;
  }

  /** Al arrancar la app: recupera la sesión si la cookie de refresh sigue siendo válida. */
  async restore(): Promise<void> {
    try {
      await firstValueFrom(this.refresh());
    } catch {
      // Sin sesión previa: se sigue como visitante.
    }
  }

  /** Cierra la sesión aquí aunque la API no responda. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<void>(`${AUTH_URL}/logout`, null, { withCredentials: true }),
      );
    } catch {
      // La cookie caducará sola; lo importante es olvidar el token local.
    } finally {
      this.session.set(undefined);
    }
  }

  setUser(user: PublicUser): void {
    this.session.update((s) => (s ? { ...s, user } : s));
  }

  private authenticate(
    action: 'login' | 'register',
    body: LoginRequest | RegisterRequest,
  ): Observable<PublicUser> {
    return this.http
      .post<AuthResponse>(`${AUTH_URL}/${action}`, body, { withCredentials: true })
      .pipe(
        tap((res) => this.start(res)),
        map((res) => res.user),
      );
  }

  private start(res: AuthResponse): void {
    this.session.set({ user: res.user, accessToken: res.accessToken });
  }
}
