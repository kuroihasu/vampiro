import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  CHARACTER_NAME_MAX_LENGTH,
  type CharacterSummary,
  EDITIONS,
  type EditionId,
} from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { CharactersApi } from '../../core/characters-api';
import { FieldErrors } from '../auth/field-errors';

/** Mis fichas, agrupadas por edición, y el formulario para empezar una nueva. */
@Component({
  selector: 'app-characters',
  imports: [RouterLink, FormField, FieldErrors],
  templateUrl: './characters.html',
  styleUrl: './characters.scss',
})
export class Characters {
  private readonly api = inject(CharactersApi);
  private readonly router = inject(Router);

  protected readonly list = httpResource<CharacterSummary[]>(() => '/api/v1/characters');
  protected readonly availableEditions = EDITIONS.filter((e) => e.available);

  protected readonly groups = computed(() => {
    if (!this.list.hasValue()) return [];
    const characters = this.list.value();
    return EDITIONS.map((e) => ({
      edition: e,
      characters: characters.filter((c) => c.edition === e.id),
    })).filter((g) => g.characters.length > 0);
  });

  protected readonly model = signal<{ name: string; edition: EditionId }>({
    name: '',
    edition: this.availableEditions[0]?.id ?? 'v20',
  });
  protected readonly createForm = form(this.model, (path) => {
    required(path.name, { message: 'Ponle un nombre; lo puedes cambiar después.' });
    maxLength(path.name, CHARACTER_NAME_MAX_LENGTH, {
      message: `Como mucho ${CHARACTER_NAME_MAX_LENGTH} caracteres.`,
    });
  });
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly confirming = signal<string | undefined>(undefined);

  protected onCreate(event: Event): void {
    event.preventDefault();
    this.error.set(undefined);
    void submit(this.createForm, async () => {
      try {
        const created = await firstValueFrom(this.api.create(this.model()));
        await this.router.navigate(['/personajes', created.id]);
      } catch (error) {
        this.error.set(errorMessage(error));
      }
    });
  }

  protected async remove(id: string): Promise<void> {
    this.error.set(undefined);
    try {
      await firstValueFrom(this.api.remove(id));
      this.confirming.set(undefined);
      this.list.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }
}
