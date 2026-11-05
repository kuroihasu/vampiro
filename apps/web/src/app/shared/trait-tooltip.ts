import { DOCUMENT } from '@angular/common';
import {
  afterRenderEffect,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  Renderer2,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { EditionId, TraitDefinition } from '@vampiro/shared';
import { RulesService } from '../core/rules.service';

let nextId = 0;
const HIDE_DELAY_MS = 150;

/**
 * Muestra el resumen y los niveles de un rasgo del ruleset al pasar el ratón,
 * al enfocar con teclado o al pulsar (táctil). Escape lo cierra (WCAG 1.4.13).
 * Úsala sobre un elemento enfocable, normalmente un <button type="button">.
 */
@Directive({
  selector: '[traitTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hideSoon()',
    '(focus)': 'show()',
    '(blur)': 'hide()',
    '(click)': 'toggle()',
    '(document:keydown.escape)': 'hide()',
    '[attr.aria-describedby]': 'describedBy()',
  },
})
export class TraitTooltip {
  readonly traitTooltip = input.required<string>();
  readonly traitEdition = input<EditionId>('v20');

  private readonly rules = inject(RulesService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  private readonly id = `trait-tooltip-${nextId++}`;
  private readonly open = signal(false);
  private panel?: HTMLElement;
  private hideTimer?: ReturnType<typeof setTimeout>;

  private readonly ruleset = rxResource({
    params: () => this.traitEdition(),
    stream: ({ params }) => this.rules.ruleset(params),
  });

  protected readonly trait = computed<TraitDefinition | undefined>(() =>
    this.ruleset.hasValue()
      ? this.ruleset.value().catalog.find((t) => t.key === this.traitTooltip())
      : undefined,
  );

  protected readonly describedBy = computed(() => (this.open() && this.trait() ? this.id : null));

  constructor() {
    afterRenderEffect(() => {
      const trait = this.trait();
      this.removePanel();
      if (this.open() && trait) this.renderPanel(trait);
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.hideTimer);
      this.removePanel();
    });
  }

  show(): void {
    clearTimeout(this.hideTimer);
    this.open.set(true);
  }

  hide(): void {
    clearTimeout(this.hideTimer);
    this.open.set(false);
  }

  /** Deja tiempo para mover el ratón hasta el tooltip sin que desaparezca. */
  hideSoon(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.open.set(false), HIDE_DELAY_MS);
  }

  toggle(): void {
    if (this.open()) this.hide();
    else this.show();
  }

  private renderPanel(trait: TraitDefinition): void {
    const r = this.renderer;
    const panel = r.createElement('div') as HTMLElement;
    r.setAttribute(panel, 'id', this.id);
    r.setAttribute(panel, 'role', 'tooltip');
    r.addClass(panel, 'trait-tooltip');

    const name = r.createElement('p');
    r.addClass(name, 'trait-tooltip__name');
    r.appendChild(name, r.createText(trait.name));
    r.appendChild(panel, name);

    const summary = r.createElement('p');
    r.appendChild(summary, r.createText(trait.summary));
    r.appendChild(panel, summary);

    if (trait.levels?.length) {
      const list = r.createElement('ol');
      r.addClass(list, 'trait-tooltip__levels');
      for (const level of trait.levels) {
        const item = r.createElement('li');
        r.appendChild(item, r.createText(level));
        r.appendChild(list, item);
      }
      r.appendChild(panel, list);
    }

    r.listen(panel, 'mouseenter', () => this.show());
    r.listen(panel, 'mouseleave', () => this.hideSoon());
    r.appendChild(this.document.body, panel);
    this.panel = panel;
    this.position(panel);
  }

  /** Debajo del rasgo; encima si no cabe. Siempre dentro de la ventana. */
  private position(panel: HTMLElement): void {
    const view = this.document.defaultView;
    if (!view) return;
    const anchor = this.host.nativeElement.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    const gap = 8;
    const below = anchor.bottom + gap;
    const top =
      below + box.height > view.innerHeight && anchor.top - gap - box.height > 0
        ? anchor.top - gap - box.height
        : below;
    const left = Math.max(gap, Math.min(anchor.left, view.innerWidth - box.width - gap));
    this.renderer.setStyle(panel, 'top', `${top}px`);
    this.renderer.setStyle(panel, 'left', `${left}px`);
  }

  private removePanel(): void {
    this.panel?.remove();
    this.panel = undefined;
  }
}
