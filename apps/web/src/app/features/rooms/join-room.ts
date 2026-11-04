import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EDITIONS, type InvitePreview } from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { ApiError, errorMessage } from '../../core/api-error';
import { SessionStore } from '../../core/auth/session-store';
import { RoomsApi } from '../../core/rooms-api';

/** /salas/unirse/:codigo — muestra a qué sala invitan y permite entrar. */
@Component({
  selector: 'app-join-room',
  imports: [RouterLink],
  template: `
    <section class="join">
      @if (preview.error(); as error) {
        <h1>Invitación no válida</h1>
        <p class="alert" role="alert">{{ previewError() }}</p>
        <p><a routerLink="/salas">Ir a mis salas</a></p>
      } @else if (preview.hasValue()) {
        @let p = preview.value();
        <p class="muted">Te invitan a</p>
        <h1>{{ p.roomName }}</h1>
        <p class="muted">
          Partida de {{ editionName() }} con {{ p.masterName }} de master. {{ p.memberCount }}
          {{ p.memberCount === 1 ? 'persona dentro' : 'personas dentro' }}.
        </p>

        @if (error(); as message) {
          <p class="alert" role="alert">{{ message }}</p>
        }

        @if (session.isAuthenticated()) {
          <button type="button" class="button" [disabled]="joining()" (click)="join()">
            {{ joining() ? 'Entrando…' : 'Unirme a la sala' }}
          </button>
        } @else {
          <p>
            <a class="button" routerLink="/entrar" [queryParams]="{ volver: returnUrl() }"
              >Entrar para unirme</a
            >
          </p>
          <p class="muted">
            ¿No tienes cuenta?
            <a routerLink="/registro">Créala</a> y vuelve a abrir este enlace.
          </p>
        }
      } @else {
        <p class="muted">Comprobando la invitación…</p>
      }
    </section>
  `,
  styles: `
    .join {
      max-width: 34rem;
      margin: clamp(0rem, 4vw, 2.5rem) auto 0;
      padding: clamp(1.75rem, 4vw, 2.75rem);
      text-align: center;
      background: linear-gradient(180deg, var(--vellum-2), var(--vellum));
      border: 1px solid var(--rule);
      border-top: 2px solid var(--blood);
      border-radius: var(--radius-lg);
      box-shadow:
        var(--shadow-2),
        0 0 80px -20px var(--blood-glow);
    }
    h1 {
      margin: 0.25rem 0 0.5rem;
    }
    .muted {
      margin: 0 0 1.5rem;
    }
    a.button {
      text-decoration: none;
    }
  `,
})
export class JoinRoom {
  readonly codigo = input.required<string>();

  protected readonly session = inject(SessionStore);
  private readonly api = inject(RoomsApi);
  private readonly router = inject(Router);

  protected readonly preview = httpResource<InvitePreview>(
    () => `/api/v1/rooms/invite/${encodeURIComponent(this.codigo())}`,
  );
  protected readonly editionName = computed(() => {
    const id = this.preview.hasValue() ? this.preview.value().edition : undefined;
    return EDITIONS.find((e) => e.id === id)?.name ?? '';
  });
  protected readonly previewError = computed(() => errorMessage(this.preview.error()));
  protected readonly returnUrl = computed(() => `/salas/unirse/${this.codigo()}`);
  protected readonly joining = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  protected async join(): Promise<void> {
    this.joining.set(true);
    this.error.set(undefined);
    try {
      const room = await firstValueFrom(this.api.join(this.codigo()));
      await this.router.navigate(['/salas', room.id]);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'YA_ES_MIEMBRO' && this.preview.hasValue()) {
        await this.router.navigate(['/salas', this.preview.value().roomId]);
        return;
      }
      this.error.set(errorMessage(error));
    } finally {
      this.joining.set(false);
    }
  }
}
