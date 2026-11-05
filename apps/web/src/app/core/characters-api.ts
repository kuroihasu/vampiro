import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { Character, CreateCharacterRequest, UpdateCharacterRequest } from '@vampiro/shared';
import type { Observable } from 'rxjs';

const URL = '/api/v1/characters';

/** Escrituras de fichas. Las lecturas de las pantallas usan httpResource. */
@Service()
export class CharactersApi {
  private readonly http = inject(HttpClient);

  create(body: CreateCharacterRequest): Observable<Character> {
    return this.http.post<Character>(URL, body);
  }

  update(id: string, body: UpdateCharacterRequest): Observable<Character> {
    return this.http.put<Character>(`${URL}/${id}`, body);
  }

  complete(id: string): Observable<Character> {
    return this.http.post<Character>(`${URL}/${id}/complete`, null);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }
}
