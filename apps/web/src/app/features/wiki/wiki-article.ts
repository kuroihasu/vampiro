import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { WIKI_CATEGORIES, type WikiArticle } from '@vampiro/shared';
import { ApiError, errorMessage } from '../../core/api-error';
import { SessionStore } from '../../core/auth/session-store';
import { Markdown } from '../../shared/markdown/markdown';
import { TraitTooltip } from '../../shared/trait-tooltip';
import { EDITION_SHORT } from '../../shared/edition-label';

@Component({
  selector: 'app-wiki-article',
  imports: [RouterLink, Markdown, TraitTooltip],
  templateUrl: './wiki-article.html',
  styleUrl: './wiki-article.scss',
})
export class WikiArticlePage {
  readonly slug = input.required<string>();
  private readonly session = inject(SessionStore);
  protected readonly isAdmin = computed(() => this.session.user()?.role === 'admin');

  protected readonly article = httpResource<WikiArticle>(
    () => `/api/v1/wiki/articles/${encodeURIComponent(this.slug())}`,
  );

  protected editionShort(id: string): string {
    return EDITION_SHORT[id as keyof typeof EDITION_SHORT] ?? id.toUpperCase();
  }

  protected readonly categoryName = computed(() => {
    if (!this.article.hasValue()) return undefined;
    const id = this.article.value().category;
    return WIKI_CATEGORIES.find((c) => c.id === id)?.name;
  });

  protected readonly notFound = computed(() => {
    const error = this.article.error();
    return error instanceof ApiError && error.status === 404;
  });

  protected readonly errorText = computed(() => {
    const error = this.article.error();
    return error ? errorMessage(error) : undefined;
  });

  constructor() {
    const title = inject(Title);
    effect(() => {
      if (this.article.hasValue()) title.setTitle(`${this.article.value().title} · Wiki · Vampiro`);
    });
  }
}
