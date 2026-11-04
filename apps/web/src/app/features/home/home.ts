import { Component } from '@angular/core';
import { EDITIONS } from '@vampiro/shared';

@Component({
  selector: 'app-home',
  template: `
    <h1>Vampiro: la Mascarada</h1>
    <p>Guías, fichas de personaje por edición, salas de partida y calculadora de dados.</p>
    <h2>Ediciones</h2>
    <ul>
      @for (edition of editions; track edition.id) {
        <li>
          {{ edition.name }}
          @if (!edition.available) {
            <small>(próximamente)</small>
          }
        </li>
      }
    </ul>
  `,
})
export class Home {
  protected readonly editions = EDITIONS;
}
