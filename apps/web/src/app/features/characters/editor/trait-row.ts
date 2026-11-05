import { Component, computed, inject, input } from '@angular/core';
import { TraitTooltip } from '../../../shared/trait-tooltip';
import { EditorStore } from './editor-store';

let nextId = 0;

/**
 * Un rasgo con sus puntos ●●●○○. Cada punto es un botón: pulsar el último lleno lo vacía.
 * Si el siguiente punto no se puede poner, el botón queda deshabilitado y se explica por qué.
 */
@Component({
  selector: 'app-trait-row',
  imports: [TraitTooltip],
  template: `
    @if (def(); as d) {
      <button type="button" class="trait name" [traitTooltip]="key()">{{ d.name }}</button>
      <div
        class="dots"
        role="group"
        [attr.aria-label]="
          d.name +
          ': ' +
          total() +
          ' de ' +
          max() +
          (extra() ? ' (' + extra() + ' con gratuitos)' : '')
        "
        [attr.aria-describedby]="reason() || errors().length ? reasonId : null"
      >
        @for (n of levels(); track n) {
          <button
            type="button"
            class="dot"
            [class.filled]="n <= total()"
            [class.fixed]="n <= base()"
            [class.extra]="n > total() - extra() && n <= total()"
            [disabled]="isDisabled(n)"
            [attr.aria-pressed]="n <= total()"
            [attr.aria-label]="n + (n === 1 ? ' punto' : ' puntos')"
            [title]="titleFor(n)"
            (click)="pick(n)"
          ></button>
        }
      </div>
      @if (errors().length || reason()) {
        <p class="note" [id]="reasonId" [class.error]="errors().length > 0">
          @for (e of errors(); track e.code) {
            <span>{{ e.message }}</span>
          } @empty {
            <span>{{ reason() }}</span>
          }
        </p>
      }
    }
  `,
  styleUrl: './trait-row.scss',
})
export class TraitRow {
  readonly key = input.required<string>();

  protected readonly store = inject(EditorStore);
  protected readonly reasonId = `trait-reason-${nextId++}`;

  protected readonly def = computed(() => this.store.trait(this.key()));
  protected readonly total = computed(() => this.store.total(this.key()));
  protected readonly minimum = computed(() => this.store.minimum(this.key()));
  /** Puntos que vienen dados por la edición (p. ej. el 1 de cada atributo). */
  protected readonly base = computed(() => this.def()?.base ?? 0);
  /** Puntos comprados con gratuitos: se pintan los últimos y en oro. */
  protected readonly extra = computed(() => this.store.freebieDots(this.key()));
  protected readonly max = computed(() => this.def()?.max ?? 5);
  protected readonly levels = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));
  protected readonly errors = computed(() => this.store.violationsFor(this.key()));

  /** Por qué no se puede subir el siguiente punto (solo si es lo que bloquea). */
  protected readonly reason = computed(() => {
    const next = this.total() + 1;
    return next <= this.max() ? this.store.blockedReason(this.key(), next) : undefined;
  });

  protected target(n: number): number {
    return n === this.total() ? n - 1 : n;
  }

  protected isDisabled(n: number): boolean {
    const target = this.target(n);
    return target < this.minimum() || this.store.blockedReason(this.key(), target) !== undefined;
  }

  protected titleFor(n: number): string {
    const target = this.target(n);
    if (target < this.minimum()) {
      return target < this.base()
        ? 'Punto de base de la edición'
        : 'Comprado con gratuitos: se devuelve en el paso de puntos gratuitos';
    }
    return this.store.blockedReason(this.key(), target) ?? '';
  }

  protected pick(n: number): void {
    this.store.setTotal(this.key(), this.target(n));
  }
}
