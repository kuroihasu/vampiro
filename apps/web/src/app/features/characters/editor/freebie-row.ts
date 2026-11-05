import { Component, computed, inject, input } from '@angular/core';
import { TraitTooltip } from '../../../shared/trait-tooltip';
import { EditorStore } from './editor-store';

/** Compra o devuelve puntos de un rasgo con puntos gratuitos. */
@Component({
  selector: 'app-freebie-row',
  imports: [TraitTooltip],
  template: `
    @if (def(); as d) {
      <button type="button" class="trait name" [traitTooltip]="key()">{{ d.name }}</button>
      <span class="value" [attr.aria-label]="d.name + ': ' + total()">
        <span class="pips" aria-hidden="true">
          @for (n of levels(); track n) {
            <span
              class="pip"
              [class.on]="n <= total()"
              [class.base]="n <= base()"
              [class.extra]="n > total() - bought() && n <= total()"
            ></span>
          }
        </span>
        {{ total() }}
        @if (bought()) {
          <small>(+{{ bought() }})</small>
        }
      </span>
      <span class="cost">{{ cost() }} / punto</span>
      <span class="buttons">
        <button
          type="button"
          class="step"
          [disabled]="!!removeReason()"
          [title]="removeReason() ?? ''"
          [attr.aria-label]="'Devolver un punto de ' + d.name"
          (click)="store.buyFreebie(key(), -1)"
        >
          −
        </button>
        <button
          type="button"
          class="step"
          [disabled]="!!addReason()"
          [title]="addReason() ?? ''"
          [attr.aria-label]="'Comprar un punto de ' + d.name"
          (click)="store.buyFreebie(key(), 1)"
        >
          +
        </button>
      </span>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(8rem, 1fr) auto 5.5rem auto;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0;
      border-bottom: 1px solid var(--rule-soft);
    }
    .name {
      justify-self: start;
      text-align: left;
    }
    .value {
      font-size: 1.15rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .value {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pips {
      display: inline-flex;
      gap: 3px;
    }
    .pip {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 50%;
      border: 1px solid rgb(201 164 92 / 0.4);
    }
    .pip.on {
      background: var(--blood);
      border-color: var(--blood-bright);
    }
    .pip.base {
      background: var(--parchment-dim);
      border-color: var(--parchment-dim);
    }
    .pip.extra {
      background: var(--gold);
      border-color: var(--gold-bright);
    }
    .value small {
      font-family: var(--font-text);
      color: var(--gold);
    }
    .value small,
    .cost {
      color: var(--ash);
      font-size: 0.875rem;
    }
    .buttons {
      display: flex;
      gap: 0.25rem;
    }
    .step {
      width: 2.25rem;
      height: 2.25rem;
      border: 1px solid var(--rule-gold);
      border-radius: 50%;
      background: rgb(0 0 0 / 0.3);
      color: var(--parchment);
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
      transition:
        background-color 0.15s,
        border-color 0.15s;
    }
    .step:hover:not(:disabled) {
      background: var(--oxblood);
      border-color: var(--blood-bright);
    }
    .step:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `,
})
export class FreebieRow {
  readonly key = input.required<string>();

  protected readonly store = inject(EditorStore);
  protected readonly def = computed(() => this.store.trait(this.key()));
  protected readonly total = computed(() => this.store.total(this.key()));
  protected readonly bought = computed(() => this.store.freebieDots(this.key()));
  protected readonly base = computed(() => this.def()?.base ?? 0);
  protected readonly levels = computed(() =>
    Array.from({ length: this.def()?.max ?? 5 }, (_, i) => i + 1),
  );
  protected readonly cost = computed(() => {
    const rules = this.store.ruleset()?.freebies;
    const def = this.def();
    if (!rules || !def) return '–';
    return rules.traitCosts?.[def.key] ?? rules.costs[def.category] ?? '–';
  });
  protected readonly addReason = computed(() => this.store.freebieReason(this.key(), 1));
  protected readonly removeReason = computed(() => this.store.freebieReason(this.key(), -1));
}
