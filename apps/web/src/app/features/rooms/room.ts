import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import {
  type CharacterState,
  type CharacterSummary,
  type DiceRollRecord,
  EDITIONS,
  type RoomCharacterInfo,
  type RoomConfig,
  type RoomDetail,
} from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { ApiError, errorMessage } from '../../core/api-error';
import { SessionStore } from '../../core/auth/session-store';
import { RoomsApi } from '../../core/rooms-api';
import { type RoomEventName, RoomSocket } from '../../core/realtime/room-socket';
import { RulesService } from '../../core/rules.service';
import { CharacterStateView } from './dice/character-state';
import { DicePanel } from './dice/dice-panel';
import { RollHistory } from './dice/roll-history';
import { RollHistoryStore } from './dice/roll-history-store';
import { RoomConfigEditor } from './room-config-editor';

/** Vista de una sala: fichas, miembros y, para el master, invitación y configuración. */
@Component({
  selector: 'app-room',
  imports: [RouterLink, RoomConfigEditor, DicePanel, RollHistory, CharacterStateView],
  providers: [RoomSocket, RollHistoryStore],
  templateUrl: './room.html',
  styleUrl: './room.scss',
})
export class Room {
  readonly id = input.required<string>();

  private readonly api = inject(RoomsApi);
  private readonly rules = inject(RulesService);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionStore);
  protected readonly socket = inject(RoomSocket);
  protected readonly history = inject(RollHistoryStore);

  protected readonly room = httpResource<RoomDetail>(
    () => `/api/v1/rooms/${encodeURIComponent(this.id())}`,
  );
  protected readonly isMaster = computed(
    () => this.room.hasValue() && this.room.value().myRole === 'master',
  );
  protected readonly editionName = computed(() => {
    const id = this.room.hasValue() ? this.room.value().edition : undefined;
    return EDITIONS.find((e) => e.id === id)?.name ?? '';
  });
  protected readonly ruleset = rxResource({
    params: () => (this.room.hasValue() ? this.room.value().edition : undefined),
    stream: ({ params }) => this.rules.ruleset(params),
  });

  /** Mis fichas de la misma edición que todavía no están en la sala. */
  private readonly myCharacters = httpResource<CharacterSummary[]>(() =>
    this.room.hasValue()
      ? { url: '/api/v1/characters', params: { edicion: this.room.value().edition } }
      : undefined,
  );
  protected readonly linkable = computed(() => {
    if (!this.myCharacters.hasValue() || !this.room.hasValue()) return [];
    const linked = new Set(this.room.value().characters.map((c) => c.characterId));
    return this.myCharacters.value().filter((c) => !linked.has(c.id));
  });

  protected readonly loadError = computed(() => {
    const error = this.room.error();
    if (!error) return undefined;
    return error instanceof ApiError && error.status === 404
      ? 'Esta sala no existe o no eres miembro.'
      : errorMessage(error);
  });

  protected readonly inviteLink = computed(() => {
    const code = this.room.hasValue() ? this.room.value().invite?.code : undefined;
    return code ? `${location.origin}/salas/unirse/${code}` : undefined;
  });

  protected readonly selectedCharacter = signal('');
  protected readonly linkAsNpc = signal(false);
  protected readonly inviteHours = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly notice = signal<string | undefined>(undefined);
  protected readonly openViolations = signal<string | undefined>(undefined);

  constructor() {
    const title = inject(Title);
    effect(() => {
      if (this.room.hasValue()) title.setTitle(`${this.room.value().name} · Salas · Vampiro`);
    });
    // Al abrir la sala: historial y tiempo real (una vez por sala).
    effect(() => {
      const id = this.id();
      untracked(() => {
        void this.history.load(id).catch(() => undefined);
        this.socket.connect(id, {
          onEvent: (event, payload) => this.onRoomEvent(event, payload),
          onResync: () => {
            void this.history.resync().catch(() => undefined);
            this.room.reload();
          },
        });
      });
    });
  }

  protected canEditState(c: RoomCharacterInfo): boolean {
    return this.isMaster() || c.controlledBy === this.session.user()?.id;
  }

  protected rolled(roll: DiceRollRecord): void {
    this.history.add(roll);
  }

  protected updateState(c: RoomCharacterInfo, change: Partial<CharacterState>): Promise<void> {
    return this.run(async () => {
      await firstValueFrom(this.api.updateState(this.id(), c.id, change));
    });
  }

  /** Las tiradas se añaden al historial; el resto de cambios recargan la sala. */
  private onRoomEvent(event: RoomEventName, payload: unknown): void {
    if (event === 'roll.created') {
      this.history.add(payload as DiceRollRecord);
      return;
    }
    if (
      event === 'member.left' &&
      (payload as { userId: string }).userId === this.session.user()?.id
    ) {
      void this.router.navigateByUrl('/salas');
      return;
    }
    this.room.reload();
  }

  protected canRemove(c: RoomCharacterInfo): boolean {
    return this.isMaster() || c.controlledBy === this.session.user()?.id;
  }

  protected async link(event: Event): Promise<void> {
    event.preventDefault();
    const characterId = this.selectedCharacter();
    if (!characterId) return;
    await this.run(async () => {
      const linked = await firstValueFrom(
        this.api.linkCharacter(this.id(), { characterId, isNpc: this.linkAsNpc() }),
      );
      this.selectedCharacter.set('');
      this.linkAsNpc.set(false);
      this.notice.set(
        linked.compliant
          ? `${linked.name} ya está en la sala.`
          : `${linked.name} está en la sala, pero no cumple todas las reglas. Revisa los motivos.`,
      );
    });
  }

  protected unlink(c: RoomCharacterInfo): Promise<void> {
    return this.run(async () => {
      await firstValueFrom(this.api.unlinkCharacter(this.id(), c.id));
      this.notice.set(`${c.name} ha salido de la sala.`);
    });
  }

  protected toggleNpc(c: RoomCharacterInfo): Promise<void> {
    return this.run(async () => {
      await firstValueFrom(this.api.updateCharacter(this.id(), c.id, { isNpc: !c.isNpc }));
    });
  }

  protected removeMember(userId: string, name: string): Promise<void> {
    return this.run(async () => {
      await firstValueFrom(this.api.removeMember(this.id(), userId));
      this.notice.set(`${name} ya no está en la sala.`);
    });
  }

  protected async leave(): Promise<void> {
    const me = this.session.user()?.id;
    if (!me) return;
    await this.run(async () => {
      await firstValueFrom(this.api.removeMember(this.id(), me));
      await this.router.navigateByUrl('/salas');
    }, false);
  }

  protected saveConfig(config: RoomConfig): Promise<void> {
    return this.run(async () => {
      await firstValueFrom(this.api.updateConfig(this.id(), config));
      this.notice.set('Configuración guardada. Las fichas de la sala se han vuelto a comprobar.');
    });
  }

  protected regenerateInvite(): Promise<void> {
    const hours = Number(this.inviteHours()) || undefined;
    return this.run(async () => {
      await firstValueFrom(this.api.regenerateInvite(this.id(), hours));
      this.notice.set('Código nuevo creado. El anterior ya no sirve.');
    });
  }

  protected async copyInvite(): Promise<void> {
    const link = this.inviteLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.notice.set('Enlace copiado.');
    } catch {
      this.notice.set('No se pudo copiar. Selecciona el enlace y cópialo a mano.');
    }
  }

  /** Ejecuta una acción, muestra el error si falla y recarga la sala. */
  private async run(action: () => Promise<void>, reload = true): Promise<void> {
    this.busy.set(true);
    this.error.set(undefined);
    this.notice.set(undefined);
    try {
      await action();
      if (reload) this.room.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
