import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { WikiArticle, WikiArticleInput } from '@vampiro/shared';
import type { Observable } from 'rxjs';

const URL = '/api/v1/wiki/articles';

/** Escrituras de la wiki (solo administradores). */
@Service()
export class WikiApi {
  private readonly http = inject(HttpClient);

  create(body: WikiArticleInput): Observable<WikiArticle> {
    return this.http.post<WikiArticle>(URL, body);
  }

  replace(slug: string, body: WikiArticleInput): Observable<WikiArticle> {
    return this.http.put<WikiArticle>(`${URL}/${encodeURIComponent(slug)}`, body);
  }

  remove(slug: string): Observable<void> {
    return this.http.delete<void>(`${URL}/${encodeURIComponent(slug)}`);
  }
}
