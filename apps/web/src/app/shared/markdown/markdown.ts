import { Component, computed, input } from '@angular/core';
import { MarkdownInline } from './markdown-inline';
import { type MdBlock, parseMarkdown } from './parse-markdown';

/** Bloques de Markdown. Recursivo para listas y citas. */
@Component({
  selector: 'app-md-blocks',
  imports: [MarkdownInline],
  template: `
    @for (block of blocks(); track $index) {
      @switch (block.kind) {
        @case ('heading') {
          @switch (block.level) {
            @case (2) {
              <h2><app-md-inline [nodes]="block.children" /></h2>
            }
            @case (3) {
              <h3><app-md-inline [nodes]="block.children" /></h3>
            }
            @default {
              <h4><app-md-inline [nodes]="block.children" /></h4>
            }
          }
        }
        @case ('paragraph') {
          <p><app-md-inline [nodes]="block.children" /></p>
        }
        @case ('list') {
          @if (block.ordered) {
            <ol>
              @for (item of block.items; track $index) {
                <li><app-md-blocks [blocks]="item" /></li>
              }
            </ol>
          } @else {
            <ul>
              @for (item of block.items; track $index) {
                <li><app-md-blocks [blocks]="item" /></li>
              }
            </ul>
          }
        }
        @case ('quote') {
          <blockquote><app-md-blocks [blocks]="block.children" /></blockquote>
        }
        @case ('code') {
          <pre><code>{{ block.text }}</code></pre>
        }
        @case ('rule') {
          <hr />
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
export class MarkdownBlocks {
  readonly blocks = input.required<MdBlock[]>();
}

/** Renderiza Markdown de forma segura (ver parse-markdown.ts). */
@Component({
  selector: 'app-markdown',
  imports: [MarkdownBlocks],
  template: `<app-md-blocks [blocks]="blocks()" />`,
  host: { class: 'prose' },
})
export class Markdown {
  readonly source = input.required<string>();
  protected readonly blocks = computed(() => parseMarkdown(this.source()));
}
