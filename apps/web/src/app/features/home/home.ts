import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type CharacterSummary, EDITIONS, type RoomSummary } from '@vampiro/shared';
import { SessionStore } from '../../core/auth/session-store';
import { EDITION_SHORT, EDITION_TAGLINE } from '../../shared/edition-label';

/** Portada: presentación, accesos directos y, con sesión, lo último en lo que trabajaste. */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly session = inject(SessionStore);
  protected readonly editions = EDITIONS;
  protected readonly short = EDITION_SHORT;
  protected readonly tagline = EDITION_TAGLINE;

  private readonly characters = httpResource<CharacterSummary[]>(() =>
    this.session.user() ? '/api/v1/characters' : undefined,
  );
  private readonly rooms = httpResource<RoomSummary[]>(() =>
    this.session.user() ? '/api/v1/rooms' : undefined,
  );

  protected readonly recentCharacters = computed(() =>
    this.characters.hasValue()
      ? [...this.characters.value()]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, 3)
      : [],
  );
  protected readonly recentRooms = computed(() =>
    this.rooms.hasValue() ? this.rooms.value().slice(0, 3) : [],
  );

  protected readonly features = [
    {
      link: '/wiki',
      numeral: 'I',
      title: 'La Wiki',
      text: 'Clanes, disciplinas, rasgos y reglas explicados con palabras propias, con fichas emergentes en cada mención.',
      cta: 'Abrir el grimorio',
    },
    {
      link: '/personajes',
      numeral: 'II',
      title: 'Fichas de personaje',
      text: 'Un editor guiado por pasos que conoce las reglas de cada edición y te avisa antes de que te pases de puntos.',
      cta: 'Crear un vástago',
    },
    {
      link: '/salas',
      numeral: 'III',
      title: 'Salas y dados',
      text: 'Reúne a tu coterie, controla Salud, Voluntad y Sangre, y tira en directo con reservas calculadas al instante.',
      cta: 'Reunir a la coterie',
    },
  ];
}
