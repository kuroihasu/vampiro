import { Component, computed, input, output } from '@angular/core';
import { type CharacterState, HEALTH_LEVELS, type RoomCharacterInfo } from '@vampiro/shared';

/**
 * Estado en partida de un personaje: salud (7 niveles), Fuerza de Voluntad y sangre.
 * Editable por el master o quien controla la ficha; para el resto, solo lectura.
 */
@Component({
  selector: 'app-character-state',
  template: `
    <div class="state">
      <div class="health" role="group" [attr.aria-label]="'Salud de ' + character().name">
        @for (level of levels(); track $index; let i = $index) {
          <button
            type="button"
            class="box"
            [class.hurt]="i < damage()"
            [disabled]="!editable()"
            [attr.aria-pressed]="i < damage()"
            [title]="level"
            [attr.aria-label]="level"
            (click)="setDamage(i)"
          ></button>
        }
        <span class="caption">{{ damage() ? levels()[damage() - 1] : 'Ileso' }}</span>
      </div>
      <div class="meter">
        <span class="name">Voluntad</span>
        @if (editable()) {
          <button
            type="button"
            class="step"
            [disabled]="willpower() <= 0"
            aria-label="Gastar un punto de Voluntad"
            (click)="spendWillpower(1)"
          >
            −
          </button>
        }
        <span class="value">{{ willpower() }} / {{ willpowerMax() }}</span>
        @if (editable()) {
          <button
            type="button"
            class="step"
            [disabled]="willpower() >= willpowerMax()"
            aria-label="Recuperar un punto de Voluntad"
            (click)="spendWillpower(-1)"
          >
            +
          </button>
        }
      </div>
      @if (hungerMax() !== undefined) {
        <div class="meter">
          <span class="name">Hambre</span>
          @if (editable()) {
            <button
              type="button"
              class="step"
              [disabled]="hunger() <= 0"
              aria-label="Bajar el Hambre"
              (click)="setHunger(hunger() - 1)"
            >
              −
            </button>
          }
          <span class="value">{{ hunger() }} / {{ hungerMax() }}</span>
          @if (editable()) {
            <button
              type="button"
              class="step"
              [disabled]="hunger() >= (hungerMax() ?? 0)"
              aria-label="Subir el Hambre"
              (click)="setHunger(hunger() + 1)"
            >
              +
            </button>
          }
        </div>
      } @else {
        <div class="meter">
          <span class="name">Sangre</span>
          @if (editable()) {
            <button
              type="button"
              class="step"
              [disabled]="blood() <= 0"
              aria-label="Gastar un punto de sangre"
              (click)="setBlood(blood() - 1)"
            >
              −
            </button>
          }
          <span class="value">{{ blood() }} / {{ bloodMax() }}</span>
          @if (editable()) {
            <button
              type="button"
              class="step"
              [disabled]="blood() >= bloodMax()"
              aria-label="Ganar un punto de sangre"
              (click)="setBlood(blood() + 1)"
            >
              +
            </button>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './character-state.scss',
})
export class CharacterStateView {
  readonly character = input.required<RoomCharacterInfo>();
  readonly editable = input(false);
  readonly change = output<Partial<CharacterState>>();

  /** V20: 7 niveles con nombre; V5: tantas casillas como su Salud. */
  protected readonly levels = computed<readonly string[]>(() => {
    const health = this.character().derived?.health;
    return health === undefined
      ? HEALTH_LEVELS
      : Array.from({ length: health }, (_, i) => `Daño ${i + 1} de ${health}`);
  });
  protected readonly hungerMax = computed(() => this.character().derived?.hungerMax);
  /** En V5 se empieza la partida con Hambre 1. */
  protected readonly hunger = computed(() => this.character().state.hunger ?? 1);
  protected readonly damage = computed(() => this.character().state.damage ?? 0);
  protected readonly willpowerMax = computed(() => this.character().derived?.willpower ?? 0);
  protected readonly willpower = computed(
    () => this.willpowerMax() - (this.character().state.willpowerSpent ?? 0),
  );
  protected readonly bloodMax = computed(() => this.character().derived?.bloodPoolMax ?? 0);
  /** Sin estado guardado, la reserva de sangre empieza llena. */
  protected readonly blood = computed(() => this.character().state.blood ?? this.bloodMax());

  /** Pulsar la última casilla herida la cura; pulsar otra marca hasta ahí. */
  protected setDamage(index: number): void {
    const next = index + 1 === this.damage() ? index : index + 1;
    this.change.emit({ damage: next });
  }

  protected spendWillpower(amount: number): void {
    const spent = (this.character().state.willpowerSpent ?? 0) + amount;
    this.change.emit({ willpowerSpent: Math.max(0, Math.min(this.willpowerMax(), spent)) });
  }

  protected setHunger(value: number): void {
    this.change.emit({ hunger: Math.max(0, Math.min(this.hungerMax() ?? 0, value)) });
  }

  protected setBlood(value: number): void {
    this.change.emit({ blood: Math.max(0, Math.min(this.bloodMax(), value)) });
  }
}
