import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import {
  form,
  FormField,
  maxLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  EDITIONS,
  type EditionId,
  RULESETS,
  WIKI_BODY_MAX_LENGTH,
  WIKI_CATEGORIES,
  WIKI_SLUG_PATTERN,
  WIKI_TITLE_MAX_LENGTH,
  type WikiArticle,
  type WikiArticleInput,
  type WikiCategoryId,
} from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { WikiApi } from '../../core/wiki-api';
import { Markdown } from '../../shared/markdown/markdown';
import { FieldErrors } from '../auth/field-errors';

interface ArticleModel {
  slug: string;
  title: string;
  category: WikiCategoryId;
  editions: EditionId[];
  traitKey: string;
  bodyMarkdown: string;
}

const EMPTY: ArticleModel = {
  slug: '',
  title: '',
  category: 'reglas',
  editions: ['v20'],
  traitKey: '',
  bodyMarkdown: '',
};

/** Crear o editar un artículo de la wiki, con vista previa del Markdown. Solo admins. */
@Component({
  selector: 'app-wiki-editor',
  imports: [RouterLink, FormField, FieldErrors, Markdown],
  templateUrl: './wiki-editor.html',
  styleUrl: './wiki-editor.scss',
})
export class WikiEditor {
  /** Slug del artículo a editar; sin él, se crea uno nuevo. */
  readonly slug = input<string>();

  private readonly api = inject(WikiApi);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly categories = WIKI_CATEGORIES;
  protected readonly editions = EDITIONS;
  protected readonly isNew = computed(() => !this.slug());

  protected readonly model = signal<ArticleModel>({ ...EMPTY });
  protected readonly articleForm = form(this.model, (path) => {
    required(path.slug, { message: 'El slug forma la dirección del artículo.' });
    pattern(path.slug, WIKI_SLUG_PATTERN, { message: 'Solo minúsculas, números y guiones.' });
    required(path.title, { message: 'Ponle un título.' });
    maxLength(path.title, WIKI_TITLE_MAX_LENGTH, {
      message: `Como mucho ${WIKI_TITLE_MAX_LENGTH} caracteres.`,
    });
    required(path.bodyMarkdown, { message: 'El artículo necesita un texto.' });
    maxLength(path.bodyMarkdown, WIKI_BODY_MAX_LENGTH, { message: 'El texto es demasiado largo.' });
    validate(path.editions, ({ value }) =>
      value().length === 0
        ? { kind: 'editions', message: 'Marca al menos una edición.' }
        : undefined,
    );
  });

  /** Rasgos de las ediciones marcadas, para enlazar el artículo con un tooltip. */
  protected readonly traits = computed(() => {
    const seen = new Map<string, string>();
    for (const edition of this.model().editions) {
      for (const t of RULESETS[edition]?.catalog ?? []) seen.set(t.key, t.name);
    }
    return [...seen]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly confirmDelete = signal(false);

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => (slug ? void this.load(slug) : this.model.set({ ...EMPTY })));
    });
  }

  protected toggleEdition(edition: EditionId, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.model.update((m) => ({
      ...m,
      editions: checked
        ? [...new Set([...m.editions, edition])]
        : m.editions.filter((e) => e !== edition),
    }));
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.error.set(undefined);
    void submit(this.articleForm, async () => {
      const m = this.model();
      const body: WikiArticleInput = {
        slug: m.slug.trim(),
        title: m.title.trim(),
        category: m.category,
        editions: m.editions,
        ...(m.traitKey ? { traitKey: m.traitKey } : {}),
        bodyMarkdown: m.bodyMarkdown,
      };
      try {
        const original = this.slug();
        const saved = await firstValueFrom(
          original ? this.api.replace(original, body) : this.api.create(body),
        );
        await this.router.navigate(['/wiki', saved.slug]);
      } catch (error) {
        this.error.set(errorMessage(error));
      }
    });
  }

  protected async remove(): Promise<void> {
    const slug = this.slug();
    if (!slug) return;
    try {
      await firstValueFrom(this.api.remove(slug));
      await this.router.navigateByUrl('/wiki');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  private async load(slug: string): Promise<void> {
    this.loading.set(true);
    try {
      const a = await firstValueFrom(
        this.http.get<WikiArticle>(`/api/v1/wiki/articles/${encodeURIComponent(slug)}`),
      );
      this.model.set({
        slug: a.slug,
        title: a.title,
        category: a.category,
        editions: a.editions,
        traitKey: a.traitKey ?? '',
        bodyMarkdown: a.bodyMarkdown,
      });
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
