import { Component, input } from '@angular/core';
import type { FieldState } from '@angular/forms/signals';

/** Primer error de un campo, solo después de que el usuario lo haya tocado. */
@Component({
  selector: 'app-field-errors',
  template: `
    @if (field().touched() && field().errors()[0]; as error) {
      <span class="field__error">{{ error.message }}</span>
    }
  `,
  host: { 'aria-live': 'polite' },
})
export class FieldErrors {
  readonly field = input.required<FieldState<string>>();
}
