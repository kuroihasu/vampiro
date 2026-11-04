import { Component, input, output } from '@angular/core';
import type { DiceRollRecord, RollOutcome } from '@vampiro/shared';

const OUTCOME: Record<RollOutcome, string> = {
  success: 'Éxito',
  failure: 'Fallo',
  botch: 'Fracaso',
  critical: 'Crítico',
  'messy-critical': 'Crítico sucio',
  'bestial-failure': 'Fallo bestial',
};

/** Historial de tiradas, de la más nueva a la más antigua. */
@Component({
  selector: 'app-roll-history',
  template: `
    <ol class="rolls" aria-label="Tiradas de la sala" aria-live="polite">
      @for (r of rolls(); track r.id) {
        <li [class]="'roll ' + r.result.outcome">
          <div class="head">
            <span class="who">{{ r.characterName ?? r.userName }}</span>
            <span class="label">{{ r.label }}</span>
            <time class="muted" [attr.datetime]="r.createdAt">{{ time(r.createdAt) }}</time>
          </div>
          <div class="dice" [attr.aria-label]="'Dados: ' + r.result.dice.join(', ')">
            @for (d of r.result.dice; track $index) {
              <span class="die" [class.hit]="isHit(r, d)" [class.one]="d === 1">{{ d }}</span>
            }
            @for (d of r.result.hungerDice ?? []; track $index) {
              <span class="die hunger" [class.hit]="isHit(r, d)" [class.one]="d === 1">{{
                d
              }}</span>
            }
          </div>
          <p class="outcome">
            <strong>{{ outcome(r) }}</strong>
            <span class="muted">{{ details(r) }}</span>
          </p>
        </li>
      } @empty {
        <li class="muted empty">Todavía no hay tiradas en esta sala.</li>
      }
    </ol>
    @if (hasMore()) {
      <button type="button" class="link-button" [disabled]="loading()" (click)="more.emit()">
        {{ loading() ? 'Cargando…' : 'Ver tiradas anteriores' }}
      </button>
    }
  `,
  styleUrl: './roll-history.scss',
})
export class RollHistory {
  readonly rolls = input.required<DiceRollRecord[]>();
  readonly hasMore = input(false);
  readonly loading = input(false);
  readonly more = output<void>();

  protected isHit(roll: DiceRollRecord, die: number): boolean {
    return die >= (roll.result.difficulty ?? 6);
  }

  protected outcome(roll: DiceRollRecord): string {
    const { outcome, successes } = roll.result;
    if (outcome === 'success') return `${successes} ${successes === 1 ? 'éxito' : 'éxitos'}`;
    if (outcome === 'critical' || outcome === 'messy-critical') {
      return `${OUTCOME[outcome]}: ${successes} éxitos`;
    }
    return OUTCOME[outcome];
  }

  /** "a dificultad 6, la tiró Nadia, solo la ve el master" */
  protected details(roll: DiceRollRecord): string {
    const parts: string[] = [];
    if (roll.result.difficulty) parts.push(`a dificultad ${roll.result.difficulty}`);
    if (roll.characterName) parts.push(`la tiró ${roll.userName}`);
    if (roll.visibility === 'master-only') parts.push('solo la ve el master');
    return parts.join(', ');
  }

  protected time(iso: string): string {
    return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }
}
