import type { CharacterSheet } from '@vampiro/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';

/** Ficha V20 completa y válida (Brujah): todos los presupuestos de creación repartidos. */
export const COMPLETE_V20_SHEET: CharacterSheet = {
  clan: 'brujah',
  priorities: {
    attribute: { physical: 0, social: 1, mental: 2 },
    ability: { talents: 0, skills: 1, knowledges: 2 },
  },
  traits: {
    // Atributos 7 / 5 / 3 (sobre la base de 1)
    fuerza: 3,
    destreza: 2,
    resistencia: 2,
    carisma: 2,
    manipulacion: 2,
    apariencia: 1,
    percepcion: 1,
    inteligencia: 1,
    astucia: 1,
    // Habilidades 13 / 9 / 5, máximo 3 por habilidad
    alerta: 2,
    atletismo: 2,
    pelea: 3,
    intimidacion: 3,
    callejeo: 3,
    'pelea-armas': 3,
    conducir: 2,
    sigilo: 2,
    'armas-fuego': 2,
    investigacion: 2,
    ocultismo: 2,
    leyes: 1,
    // Disciplinas de clan 3, trasfondos 5, virtudes 7
    celeridad: 1,
    potencia: 1,
    presencia: 1,
    recursos: 2,
    contactos: 2,
    aliados: 1,
    conciencia: 3,
    autocontrol: 2,
    coraje: 2,
  },
  freebies: [{ traitKey: 'voluntad', dots: 2 }],
};

/** Ficha V5 completa y válida (Brujah, distribución equilibrada). */
export const COMPLETE_V5_SHEET: CharacterSheet = {
  clan: 'brujah',
  priorities: {},
  patternChoices: { skills: 'equilibrada' },
  traits: {
    fuerza: 4,
    destreza: 3,
    resistencia: 3,
    carisma: 3,
    manipulacion: 2,
    compostura: 2,
    inteligencia: 2,
    astucia: 2,
    resolucion: 1,
    pelea: 3,
    atletismo: 3,
    intimidacion: 3,
    callejeo: 2,
    sigilo: 2,
    conducir: 2,
    persuasion: 2,
    perspicacia: 2,
    academicismo: 1,
    ocultismo: 1,
    investigacion: 1,
    'armas-fuego': 1,
    etiqueta: 1,
    subterfugio: 1,
    tecnologia: 1,
    potencia: 2,
    presencia: 1,
    contactos: 3,
    recursos: 2,
  },
  freebies: [],
  meritsFlaws: ['belleza', 'presa-exclusiva'],
  specialties: [
    { skill: 'academicismo', name: 'Historia del arte' },
    { skill: 'pelea', name: 'Placajes' },
  ],
};

/** Ficha completa de Edad Oscura: Lasombra en el Camino de los Reyes. */
export const COMPLETE_DARK_AGES_SHEET: CharacterSheet = {
  clan: 'lasombra',
  road: 'reyes',
  priorities: {
    attribute: { physical: 2, social: 0, mental: 1 },
    ability: { talents: 0, skills: 1, knowledges: 2 },
  },
  traits: {
    fuerza: 1,
    destreza: 1,
    resistencia: 1,
    carisma: 3,
    manipulacion: 3,
    apariencia: 1,
    percepcion: 2,
    inteligencia: 2,
    astucia: 1,
    alerta: 2,
    consciencia: 1,
    empatia: 2,
    expresion: 2,
    intimidacion: 3,
    liderazgo: 3,
    etiqueta: 3,
    'pelea-armas': 3,
    cabalgar: 3,
    politica: 3,
    leyes: 2,
    dominacion: 2,
    obtenebracion: 1,
    dominio: 2,
    recursos: 2,
    estatus: 1,
    conviccion: 3,
    autocontrol: 2,
    coraje: 2,
  },
  freebies: [{ traitKey: 'voluntad', dots: 2 }],
};

/** Registra un usuario y devuelve su cabecera Authorization. */
export async function registerUser(server: App, email: string): Promise<{ Authorization: string }> {
  const res = await request(server)
    .post('/api/v1/auth/register')
    .send({ email, password: 'contraseña-de-prueba-123', displayName: email.split('@')[0] })
    .expect(201);
  return { Authorization: `Bearer ${res.body.accessToken as string}` };
}
