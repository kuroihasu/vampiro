import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import type { EditionId, EditionInfo, Ruleset } from '@vampiro/shared';
import { Observable, of, tap } from 'rxjs';

/**
 * Carga las ediciones y los rulesets desde la API y los guarda en memoria.
 * El editor de fichas y la directiva de tooltips leen de aquí.
 */
@Injectable({ providedIn: 'root' })
export class RulesService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<EditionId, Ruleset>();

  readonly editions = signal<readonly EditionInfo[]>([]);

  loadEditions(): Observable<readonly EditionInfo[]> {
    return this.http
      .get<EditionInfo[]>('/api/v1/editions')
      .pipe(tap((editions) => this.editions.set(editions)));
  }

  ruleset(edition: EditionId): Observable<Ruleset> {
    const cached = this.cache.get(edition);
    if (cached) return of(cached);
    return this.http
      .get<Ruleset>(`/api/v1/rulesets/${edition}`)
      .pipe(tap((ruleset) => this.cache.set(edition, ruleset)));
  }
}
