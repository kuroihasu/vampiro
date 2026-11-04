import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, maxLength, minLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { EDITIONS, type EditionId, ROOM_NAME_MAX_LENGTH, type RoomSummary } from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { RoomsApi } from '../../core/rooms-api';
import { FieldErrors } from '../auth/field-errors';

/** Mis salas, crear una nueva y unirse con un código. */
@Component({
  selector: 'app-rooms',
  imports: [RouterLink, FormField, FieldErrors],
  templateUrl: './rooms.html',
  styleUrl: './rooms.scss',
})
export class Rooms {
  private readonly api = inject(RoomsApi);
  private readonly router = inject(Router);

  protected readonly list = httpResource<RoomSummary[]>(() => '/api/v1/rooms');
  protected readonly editions = EDITIONS.filter((e) => e.available);
  protected readonly editionName = (id: EditionId) => EDITIONS.find((e) => e.id === id)?.name ?? id;

  protected readonly createModel = signal<{ name: string; edition: EditionId }>({
    name: '',
    edition: this.editions[0]?.id ?? 'v20',
  });
  protected readonly createForm = form(this.createModel, (path) => {
    required(path.name, { message: 'Ponle un nombre a la sala.' });
    maxLength(path.name, ROOM_NAME_MAX_LENGTH, {
      message: `Como mucho ${ROOM_NAME_MAX_LENGTH} caracteres.`,
    });
  });

  protected readonly joinModel = signal({ code: '' });
  protected readonly joinForm = form(this.joinModel, (path) => {
    required(path.code, { message: 'Escribe el código que te pasó el master.' });
    minLength(path.code, 4, { message: 'El código es más largo.' });
  });

  protected readonly error = signal<string | undefined>(undefined);

  protected onCreate(event: Event): void {
    event.preventDefault();
    this.error.set(undefined);
    void submit(this.createForm, async () => {
      try {
        const room = await firstValueFrom(this.api.create(this.createModel()));
        await this.router.navigate(['/salas', room.id]);
      } catch (error) {
        this.error.set(errorMessage(error));
      }
    });
  }

  protected onJoin(event: Event): void {
    event.preventDefault();
    this.error.set(undefined);
    void submit(this.joinForm, async () => {
      try {
        const room = await firstValueFrom(this.api.join(this.joinModel().code));
        await this.router.navigate(['/salas', room.id]);
      } catch (error) {
        this.error.set(errorMessage(error));
      }
    });
  }
}
