import { Component, computed, inject, input, output, resource, signal } from '@angular/core';
import {
  type DiceRollRecord,
  MAX_DICE,
  type RollRequest,
  type RoomDetail,
  type Ruleset,
} from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../../core/api-error';
import { RoomsApi } from '../../../core/rooms-api';

type Mode = 'action' | 'traits';

/**
 * Panel de tirada: personaje (o tirada libre), acción sugerida o atributo + habilidad,
 * modificador y dificultad. La reserva se calcula en el servidor antes de tirar.
 */
@Component({
  selector: 'app-dice-panel',
  templateUrl: './dice-panel.html',
  styleUrl: './dice-panel.scss',
})
export class DicePanel {
  readonly room = input.required<RoomDetail>();
  readonly ruleset = input.required<Ruleset>();
  readonly userId = input.required<string>();
  readonly rolled = output<DiceRollRecord>();

  /** Para dibujar la reserva como dados pequeños (con un tope de 20). */
  protected range(n: number): number[] {
    return Array.from({ length: Math.min(Math.max(n, 0), 20) }, (_, i) => i);
  }

  private readonly api = inject(RoomsApi);

  protected readonly characterId = signal('');
  protected readonly mode = signal<Mode>('action');
  protected readonly actionKey = signal('');
  protected readonly attribute = signal('');
  protected readonly ability = signal('');
  protected readonly modifier = signal(0);
  protected readonly difficulty = signal(6);
  protected readonly freeDice = signal(5);
  protected readonly hunger = signal(1);
  protected readonly maxDice = MAX_DICE;

  protected readonly rolling = signal(false);
  protected readonly error = signal<string | undefined>(undefined);

  /** El master tira con cualquier ficha de la sala; un jugador, con las suyas. */
  protected readonly characters = computed(() => {
    const room = this.room();
    return room.myRole === 'master'
      ? room.characters
      : room.characters.filter((c) => c.controlledBy === this.userId());
  });
  protected readonly actions = computed(() => this.ruleset().actions);
  protected readonly attributes = computed(() =>
    this.ruleset().catalog.filter((t) => t.category === 'attribute'),
  );
  protected readonly abilities = computed(() =>
    this.ruleset().catalog.filter((t) => t.category === 'ability'),
  );
  protected readonly usesDifficulty = computed(() => this.ruleset().dice.kind === 'difficulty');
  /** V5: las tiradas llevan dados de Hambre (con personaje, los de su estado en la sala). */
  protected readonly usesHunger = computed(() => {
    const dice = this.ruleset().dice;
    return dice.kind === 'success-threshold' && dice.hungerDice;
  });

  /** Petición actual, o undefined si falta algo para calcular la reserva. */
  protected readonly request = computed<RollRequest | undefined>(() => {
    const base = {
      ...(this.modifier() ? { modifier: this.modifier() } : {}),
      ...(this.usesDifficulty() ? { difficulty: this.difficulty() } : {}),
    };
    const characterId = this.characterId();
    if (!characterId) {
      const dice = this.freeDice();
      const hunger = this.usesHunger() ? { hunger: this.hunger() } : {};
      return dice >= 1 && dice <= MAX_DICE ? { ...base, ...hunger, dice } : undefined;
    }
    if (this.mode() === 'action') {
      return this.actionKey()
        ? { ...base, roomCharacterId: characterId, actionKey: this.actionKey() }
        : undefined;
    }
    const traits = [this.attribute(), this.ability()].filter(Boolean);
    return traits.length ? { ...base, roomCharacterId: characterId, traits } : undefined;
  });

  protected readonly preview = resource({
    params: () => this.request(),
    loader: ({ params }) => firstValueFrom(this.api.dicePool(this.room().id, params)),
  });

  protected async roll(event: Event): Promise<void> {
    event.preventDefault();
    const request = this.request();
    if (!request) return;
    this.rolling.set(true);
    this.error.set(undefined);
    try {
      this.rolled.emit(await firstValueFrom(this.api.roll(this.room().id, request)));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.rolling.set(false);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected number(event: Event, fallback: number): number {
    const n = Number((event.target as HTMLInputElement).value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }
}
