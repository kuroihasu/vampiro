import { Component, computed, inject, input } from '@angular/core';
import { TraitTooltip } from '../../../shared/trait-tooltip';
import { EditorStore } from './editor-store';

let nextId = 0;

/** Un mérito o defecto: casilla para tomarlo, coste y, si no se puede, el motivo. */
@Component({
  selector: 'app-merit-row',
  imports: [TraitTooltip],
  template: `
    @if (def(); as d) {
      <input
        type="checkbox"
        [id]="inputId"
        [checked]="taken()"
        [disabled]="!!reason()"
        [attr.aria-describedby]="reason() || errors().length ? noteId : null"
        (change)="store.toggleMeritFlaw(key())"
      />
      <label [for]="inputId" class="name">{{ d.name }}</label>
      <button
        type="button"
        class="trait info"
        [traitTooltip]="key()"
        [attr.aria-label]="'Qué es ' + d.name"
      >
        ?
      </button>
      <span class="cost">{{ d.category === 'merit' ? '−' : '+' }}{{ d.cost }}</span>
      @if (errors().length || reason()) {
        <p class="note" [id]="noteId" [class.error]="errors().length > 0">
          {{ errors()[0]?.message ?? reason() }}
        </p>
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto 2.5rem;
      align-items: center;
      gap: 0.25rem 0.6rem;
      padding: 0.45rem 0;
      border-bottom: 1px solid var(--rule-soft);
    }
    input {
      accent-color: var(--oxblood);
      width: 1.1rem;
      height: 1.1rem;
    }
    input:disabled + .name {
      color: var(--ash);
    }
    .info {
      width: 1.5rem;
      height: 1.5rem;
      border: 1px solid var(--rule-gold);
      border-radius: 50%;
      font-size: 0.8125rem;
      text-decoration: none;
      color: var(--gold);
    }
    input:checked + .name {
      color: var(--gold-bright);
    }
    .cost {
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: var(--ash);
    }
    .note {
      grid-column: 2 / -1;
      margin: 0;
      font-size: 0.875rem;
      color: var(--ash);
    }
    .note.error {
      color: var(--danger);
    }
  `,
})
export class MeritRow {
  readonly key = input.required<string>();

  protected readonly store = inject(EditorStore);
  protected readonly inputId = `merit-${nextId++}`;
  protected readonly noteId = `${this.inputId}-note`;
  protected readonly def = computed(() => this.store.trait(this.key()));
  protected readonly taken = computed(() => this.store.hasMeritFlaw(this.key()));
  protected readonly reason = computed(() => this.store.meritFlawReason(this.key()));
  protected readonly errors = computed(() => this.store.violationsFor(this.key()));
}
