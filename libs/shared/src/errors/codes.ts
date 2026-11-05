/** Códigos de violación de reglas que comparten el front (alertas) y el back (422). */
export const VIOLATION_CODES = [
  'PRESUPUESTO_EXCEDIDO',
  'MAX_CREACION_SUPERADO',
  'MAX_GENERACION_SUPERADO',
  'DISCIPLINA_FUERA_DE_CLAN',
  'DISCIPLINA_NO_PERMITIDA',
  'MERITOS_DESACTIVADOS',
  'CLAN_NO_PERMITIDO',
  'REQUISITO_NO_CUMPLIDO',
  'PUNTOS_SIN_REPARTIR',
  'PRIORIDAD_INVALIDA',
  'RASGO_DESCONOCIDO',
] as const;

export type ViolationCode = (typeof VIOLATION_CODES)[number];

/** Códigos de error de la API (campo `code` del formato de error común). */
export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'RULE_VIOLATION',
  'NO_AUTENTICADO',
  'PROHIBIDO',
  'NO_ENCONTRADO',
  'EMAIL_EN_USO',
  'CREDENCIALES_INVALIDAS',
  'INVITACION_INVALIDA',
  'INVITACION_VENCIDA',
  'YA_ES_MIEMBRO',
  'FICHA_YA_VINCULADA',
  'EDICION_INCOMPATIBLE',
  'EDICION_NO_DISPONIBLE',
  'CONFLICTO_VERSION',
  'DEMASIADAS_SOLICITUDES',
  'ERROR_INTERNO',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
