import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta o un controlador como accesible sin token (el guard JWT es global). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
