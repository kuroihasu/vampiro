import { Component, inject, input, signal } from '@angular/core';
import { email, form, FormField, maxLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { PASSWORD_MAX_LENGTH } from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { safeReturnUrl } from '../../core/auth/auth-guard';
import { SessionStore } from '../../core/auth/session-store';
import { FieldErrors } from './field-errors';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, FieldErrors],
  templateUrl: './login.html',
  styleUrl: './auth-page.scss',
})
export class Login {
  /** URL a la que volver tras entrar (?volver=). */
  readonly volver = input<string>();

  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(this.model, (path) => {
    required(path.email, { message: 'Escribe tu email.' });
    email(path.email, { message: 'Ese email no parece válido.' });
    required(path.password, { message: 'Escribe tu contraseña.' });
    maxLength(path.password, PASSWORD_MAX_LENGTH);
  });
  protected readonly serverError = signal<string | undefined>(undefined);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(undefined);
    void submit(this.loginForm, async () => {
      try {
        await firstValueFrom(this.session.login(this.model()));
        await this.router.navigateByUrl(safeReturnUrl(this.volver()));
      } catch (error) {
        this.serverError.set(errorMessage(error));
      }
    });
  }
}
