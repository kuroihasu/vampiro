import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TraitTooltip } from '../trait-tooltip';
import type { MdInline } from './parse-markdown';

/** Pinta nodos en línea. Todo el texto pasa por interpolación (escapado por Angular). */
@Component({
  selector: 'app-md-inline',
  imports: [RouterLink, TraitTooltip],
  template: `
    @for (node of nodes(); track $index) {
      @switch (node.kind) {
        @case ('text') {
          {{ node.text }}
        }
        @case ('code') {
          <code>{{ node.text }}</code>
        }
        @case ('br') {
          <br />
        }
        @case ('strong') {
          <strong><app-md-inline [nodes]="node.children" /></strong>
        }
        @case ('em') {
          <em><app-md-inline [nodes]="node.children" /></em>
        }
        @case ('del') {
          <del><app-md-inline [nodes]="node.children" /></del>
        }
        @case ('trait') {
          <button type="button" class="trait" [traitTooltip]="node.key">
            <app-md-inline [nodes]="node.children" />
          </button>
        }
        @case ('internal') {
          <a [routerLink]="node.path"><app-md-inline [nodes]="node.children" /></a>
        }
        @case ('external') {
          <a [href]="node.href" target="_blank" rel="noopener noreferrer"
            ><app-md-inline [nodes]="node.children"
          /></a>
        }
      }
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class MarkdownInline {
  readonly nodes = input.required<MdInline[]>();
}
