import { Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  maxLength,
  minLength,
  required,
  submit,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { SessionStore } from '../../core/auth/session-store';
import { FieldErrors } from './field-errors';

@Component({
  selector: 'app-register',
  imports: [FormField, RouterLink, FieldErrors],
  templateUrl: './register.html',
  styleUrl: './auth-page.scss',
})
export class Register {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly passwordMin = PASSWORD_MIN_LENGTH;
  protected readonly model = signal({ displayName: '', email: '', password: '' });
  protected readonly registerForm = form(this.model, (path) => {
    required(path.displayName, { message: 'Dinos cómo quieres que te llamen.' });
    minLength(path.displayName, 2, { message: 'Usa al menos 2 caracteres.' });
    maxLength(path.displayName, DISPLAY_NAME_MAX_LENGTH, {
      message: `Usa como mucho ${DISPLAY_NAME_MAX_LENGTH} caracteres.`,
    });
    required(path.email, { message: 'Escribe tu email.' });
    email(path.email, { message: 'Ese email no parece válido.' });
    required(path.password, { message: 'Elige una contraseña.' });
    minLength(path.password, PASSWORD_MIN_LENGTH, {
      message: `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    });
    maxLength(path.password, PASSWORD_MAX_LENGTH, {
      message: `Usa como mucho ${PASSWORD_MAX_LENGTH} caracteres.`,
    });
  });
  protected readonly serverError = signal<string | undefined>(undefined);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.serverError.set(undefined);
    void submit(this.registerForm, async () => {
      try {
        await firstValueFrom(this.session.register(this.model()));
        await this.router.navigateByUrl('/personajes');
      } catch (error) {
        this.serverError.set(errorMessage(error));
      }
    });
  }
}
