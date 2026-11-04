import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, linkedSignal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  isWikiCategoryId,
  WIKI_CATEGORIES,
  type WikiArticleSummary,
  type WikiCategory,
} from '@vampiro/shared';
import { errorMessage } from '../../core/api-error';
import { SessionStore } from '../../core/auth/session-store';

/** Índice de la wiki: categorías a la izquierda, resultados a la derecha. */
@Component({
  selector: 'app-wiki',
  imports: [RouterLink, FormField],
  templateUrl: './wiki.html',
  styleUrl: './wiki.scss',
})
export class Wiki {
  /** ?categoria= y ?q= llegan como inputs (withComponentInputBinding). */
  readonly categoria = input<string>();
  readonly q = input<string>();

  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);
  protected readonly isAdmin = computed(() => this.session.user()?.role === 'admin');

  protected readonly category = computed(() => {
    const id = this.categoria();
    return isWikiCategoryId(id) ? WIKI_CATEGORIES.find((c) => c.id === id) : undefined;
  });

  protected readonly categories = httpResource<WikiCategory[]>(() => '/api/v1/wiki/categories');

  protected readonly articles = httpResource<WikiArticleSummary[]>(() => {
    const params: Record<string, string> = {};
    const category = this.category();
    const q = this.q()?.trim();
    if (category) params['categoria'] = category.id;
    if (q) params['q'] = q;
    return { url: '/api/v1/wiki/articles', params };
  });

  /** El campo de búsqueda empieza con el ?q= actual y se puede editar. */
  private readonly searchModel = linkedSignal(() => ({ q: this.q() ?? '' }));
  protected readonly searchForm = form(this.searchModel);

  protected readonly heading = computed(() => {
    const q = this.q()?.trim();
    const category = this.category();
    if (q) return `Resultados para «${q}»${category ? ` en ${category.name}` : ''}`;
    return category?.name ?? 'Todos los artículos';
  });

  protected readonly errorText = computed(() => {
    const error = this.articles.error();
    return error ? errorMessage(error) : undefined;
  });

  constructor() {
    // Si llega una categoría que no existe, se limpia de la URL.
    effect(() => {
      const raw = this.categoria();
      if (raw && !isWikiCategoryId(raw)) {
        void this.router.navigate([], {
          queryParams: { categoria: null },
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  protected search(event: Event): void {
    event.preventDefault();
    const q = this.searchModel().q.trim();
    void this.router.navigate([], {
      queryParams: { q: q || null },
      queryParamsHandling: 'merge',
    });
  }
}
