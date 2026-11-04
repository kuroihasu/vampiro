import type { Ruleset } from '../types/ruleset.js';
import type { TraitDefinition } from '../types/trait.js';

/*
 * Ruleset de V5 (Vampiro: la Mascarada 5ª edición). Textos propios y resumidos.
 * Los números de creación (patrones, ventajas, defectos, especialidades) siguen la idea
 * del manual y deben revisarse contra él; los costes de méritos y defectos son orientativos.
 * Pendiente: tipos de depredador, generaciones distintas de neonato y alquimia de sangre débil.
 */

const attr = (key: string, name: string, group: string, summary: string): TraitDefinition => ({
  key,
  name,
  category: 'attribute',
  group,
  summary,
  base: 0,
  max: 5,
});

const skill = (key: string, name: string, group: string, summary: string): TraitDefinition => ({
  key,
  name,
  category: 'ability',
  group,
  summary,
  base: 0,
  max: 5,
});

const discipline = (key: string, name: string, summary: string): TraitDefinition => ({
  key,
  name,
  category: 'discipline',
  summary,
  base: 0,
  max: 5,
});

const background = (key: string, name: string, summary: string): TraitDefinition => ({
  key,
  name,
  category: 'background',
  summary,
  base: 0,
  max: 5,
});

const merit = (key: string, name: string, cost: number, summary: string): TraitDefinition => ({
  key,
  name,
  category: 'merit',
  cost,
  summary,
});

const flaw = (key: string, name: string, cost: number, summary: string): TraitDefinition => ({
  key,
  name,
  category: 'flaw',
  cost,
  summary,
});

export const V5_RULESET: Ruleset = {
  edition: 'v5',
  version: '2026.11.0',
  catalog: [
    // Atributos
    attr('fuerza', 'Fuerza', 'physical', 'Potencia muscular: golpear, cargar, romper.'),
    attr('destreza', 'Destreza', 'physical', 'Agilidad y precisión de movimientos.'),
    attr('resistencia', 'Resistencia', 'physical', 'Aguante del cuerpo; marca tu Salud.'),
    attr('carisma', 'Carisma', 'social', 'Atraer y convencer con tu presencia.'),
    attr('manipulacion', 'Manipulación', 'social', 'Llevar a otros a donde quieres.'),
    attr('compostura', 'Compostura', 'social', 'Mantener la calma y la máscara bajo presión.'),
    attr('inteligencia', 'Inteligencia', 'mental', 'Memoria, razonamiento y saber.'),
    attr('astucia', 'Astucia', 'mental', 'Reaccionar rápido y leer la situación.'),
    attr('resolucion', 'Resolución', 'mental', 'Concentración y determinación sostenida.'),

    // Habilidades físicas
    skill('atletismo', 'Atletismo', 'physical', 'Correr, trepar, saltar y nadar.'),
    skill('pelea', 'Pelea', 'physical', 'Combate sin armas.'),
    skill('artesania', 'Artesanía', 'physical', 'Crear y reparar cosas con las manos.'),
    skill('conducir', 'Conducir', 'physical', 'Manejar vehículos en situaciones difíciles.'),
    skill('armas-fuego', 'Armas de fuego', 'physical', 'Disparar, cuidar y reconocer armas.'),
    skill('latrocinio', 'Latrocinio', 'physical', 'Abrir cerraduras, robar y forzar.'),
    skill('pelea-armas', 'Pelea con armas', 'physical', 'Cuchillos, bates, espadas y estacas.'),
    skill('sigilo', 'Sigilo', 'physical', 'Moverte sin ser visto ni oído.'),
    skill('supervivencia', 'Supervivencia', 'physical', 'Valerse fuera de la ciudad.'),
    // Habilidades sociales
    skill(
      'trato-animales',
      'Trato con animales',
      'social',
      'Calmar, entrenar y entender animales.',
    ),
    skill('etiqueta', 'Etiqueta', 'social', 'Moverse en sociedad sin ofender.'),
    skill('perspicacia', 'Perspicacia', 'social', 'Leer intenciones y emociones ajenas.'),
    skill('intimidacion', 'Intimidación', 'social', 'Imponerte por miedo.'),
    skill('liderazgo', 'Liderazgo', 'social', 'Que otros te sigan.'),
    skill('interpretacion', 'Interpretación', 'social', 'Actuar, cantar o tocar ante un público.'),
    skill('persuasion', 'Persuasión', 'social', 'Convencer con argumentos.'),
    skill('callejeo', 'Callejeo', 'social', 'Conocer la calle y a su gente.'),
    skill('subterfugio', 'Subterfugio', 'social', 'Mentir y ocultar lo que sientes.'),
    // Habilidades mentales
    skill('academicismo', 'Academicismo', 'mental', 'Humanidades, historia y arte.'),
    skill('consciencia', 'Consciencia', 'mental', 'Percibir lo sobrenatural.'),
    skill('finanzas', 'Finanzas', 'mental', 'Dinero, mercados y contabilidad.'),
    skill('investigacion', 'Investigación', 'mental', 'Seguir pistas y reunir pruebas.'),
    skill('medicina', 'Medicina', 'mental', 'Curar cuerpos y entender heridas.'),
    skill('ocultismo', 'Ocultismo', 'mental', 'Saber sobre lo oculto y lo arcano.'),
    skill('politica', 'Política', 'mental', 'Entender y mover instituciones.'),
    skill('ciencia', 'Ciencia', 'mental', 'Física, química, biología…'),
    skill('tecnologia', 'Tecnología', 'mental', 'Ordenadores, redes y aparatos.'),

    // Disciplinas
    discipline('animalismo', 'Animalismo', 'Vínculo con las bestias y con la Bestia interior.'),
    discipline('auspex', 'Auspex', 'Sentidos y percepción más allá de lo humano.'),
    discipline('celeridad', 'Celeridad', 'Velocidad y reflejos sobrenaturales.'),
    discipline('dominacion', 'Dominación', 'Imponer tu voluntad a otras mentes.'),
    discipline('fortaleza', 'Fortaleza', 'Resistir daño que destruiría a otros.'),
    discipline('ofuscacion', 'Ofuscación', 'Pasar desapercibido o cambiar lo que otros ven.'),
    discipline('potencia', 'Potencia', 'Fuerza física sobrenatural.'),
    discipline('presencia', 'Presencia', 'Atraer, asustar o fascinar emocionalmente.'),
    discipline('proteanismo', 'Proteanismo', 'Cambiar de forma y fundirte con la tierra.'),
    discipline(
      'hechiceria-de-sangre',
      'Hechicería de sangre',
      'Magia ritual a través de la vitae.',
    ),

    // Ventajas: trasfondos
    background('aliados', 'Aliados', 'Mortales que te ayudan cuando lo necesitas.'),
    background('contactos', 'Contactos', 'Gente que te pasa información.'),
    background('fama', 'Fama', 'Te conocen entre los mortales, para bien o para mal.'),
    background('rebano', 'Rebaño', 'Mortales de los que te alimentas sin riesgo.'),
    background('influencia', 'Influencia', 'Peso en instituciones mortales.'),
    background('refugio', 'Refugio', 'Un lugar seguro donde pasar el día.'),
    background('mascara', 'Máscara', 'Una identidad mortal sólida y documentada.'),
    background('mawla', 'Mawla', 'Un vampiro mayor que te aconseja.'),
    background('recursos', 'Recursos', 'Dinero y bienes a tu disposición.'),
    background('criados', 'Criados', 'Servidores mortales leales.'),
    background('estatus', 'Estatus', 'Posición en la sociedad de los Vástagos.'),

    // Ventajas: méritos
    merit('idioma', 'Idioma', 1, 'Dominas una lengua más.'),
    merit('belleza', 'Belleza', 2, 'Tu aspecto abre puertas.'),
    merit('sentido-del-peligro', 'Sentido del peligro', 2, 'Notas cuando algo va a salir mal.'),
    merit('bebedor-refinado', 'Paladar refinado', 1, 'Distingues la sangre por su sabor.'),
    merit('sangre-tranquila', 'Sangre tranquila', 2, 'El Hambre te pesa un poco menos.'),
    merit('lazos-de-familia', 'Lazos de familia', 1, 'Tu familia mortal todavía te cubre.'),

    // Defectos
    flaw('enemigo', 'Enemigo', 1, 'Alguien quiere hacerte daño.'),
    flaw(
      'presa-exclusiva',
      'Presa exclusiva',
      2,
      'Solo puedes alimentarte de cierto tipo de mortal.',
    ),
    flaw('adiccion', 'Adicción', 1, 'Necesitas sangre con cierta sustancia.'),
    flaw('fea', 'Fealdad', 1, 'Tu aspecto incomoda a los mortales.'),
    flaw('obsesion', 'Obsesión', 1, 'Algo te absorbe y te cuesta dejarlo.'),
    flaw('perseguido', 'Perseguido', 2, 'Cazadores o rivales siguen tu rastro.'),

    // Derivados (no se reparten al crear)
    {
      key: 'humanidad',
      name: 'Humanidad',
      category: 'other',
      summary: 'Lo que queda de tu parte humana. Empieza en 7.',
      base: 0,
      max: 10,
    },
    {
      key: 'voluntad',
      name: 'Fuerza de Voluntad',
      category: 'other',
      summary: 'Determinación para resistir. Es Compostura + Resolución.',
      base: 0,
      max: 10,
    },
  ],
  clans: [
    {
      key: 'brujah',
      name: 'Brujah',
      disciplines: ['celeridad', 'potencia', 'presencia'],
      weakness: 'Su ira estalla con facilidad.',
    },
    {
      key: 'gangrel',
      name: 'Gangrel',
      disciplines: ['animalismo', 'fortaleza', 'proteanismo'],
      weakness: 'La Bestia les deja marcas animales.',
    },
    {
      key: 'malkavian',
      name: 'Malkavian',
      disciplines: ['auspex', 'dominacion', 'ofuscacion'],
      weakness: 'Su mente está fracturada.',
    },
    {
      key: 'nosferatu',
      name: 'Nosferatu',
      disciplines: ['animalismo', 'ofuscacion', 'potencia'],
      weakness: 'Su aspecto es monstruoso.',
    },
    {
      key: 'toreador',
      name: 'Toreador',
      disciplines: ['auspex', 'celeridad', 'presencia'],
      weakness: 'La fealdad y la belleza les arrastran.',
    },
    {
      key: 'tremere',
      name: 'Tremere',
      disciplines: ['auspex', 'dominacion', 'hechiceria-de-sangre'],
      weakness: 'Su sangre ya no crea vínculos fiables.',
    },
    {
      key: 'ventrue',
      name: 'Ventrue',
      disciplines: ['dominacion', 'fortaleza', 'presencia'],
      weakness: 'Solo les nutre un tipo de presa.',
    },
  ],
  creation: {
    priorities: [],
    patterns: [
      {
        key: 'attributes',
        label: 'Atributos',
        category: 'attribute',
        groupLabels: { physical: 'Físicos', social: 'Sociales', mental: 'Mentales' },
        options: [
          { id: 'estandar', label: '4/3/3/3/2/2/2/2/1', values: [4, 3, 3, 3, 2, 2, 2, 2, 1] },
        ],
      },
      {
        key: 'skills',
        label: 'Habilidades',
        category: 'ability',
        groupLabels: { physical: 'Físicas', social: 'Sociales', mental: 'Mentales' },
        options: [
          {
            id: 'todoterreno',
            label: 'Todoterreno (1×3, 8×2, 10×1)',
            values: [3, ...Array<number>(8).fill(2), ...Array<number>(10).fill(1)],
          },
          {
            id: 'equilibrada',
            label: 'Equilibrada (3×3, 5×2, 7×1)',
            values: [3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1],
          },
          {
            id: 'especialista',
            label: 'Especialista (1×4, 3×3, 3×2, 3×1)',
            values: [4, 3, 3, 3, 2, 2, 2, 1, 1, 1],
          },
        ],
      },
      {
        key: 'disciplines',
        label: 'Disciplinas',
        category: 'discipline',
        clanOnly: true,
        options: [{ id: 'clan', label: 'Una a 2 y otra a 1', values: [2, 1] }],
      },
    ],
    fixed: [{ category: 'background', label: 'Ventajas', points: 7 }],
  },
  specialties: { freeFor: ['academicismo', 'artesania', 'interpretacion', 'ciencia'], extra: 1 },
  meritsFlaws: { maxFlawPoints: 2, requiredFlawPoints: 2, meritsBudget: 'background' },
  derived: {
    humanity: { from: [], base: 7, traitKey: 'humanidad', max: 10 },
    willpower: { from: ['compostura', 'resolucion'], traitKey: 'voluntad', max: 10 },
    generation: { base: 13, min: 10 },
    health: { from: ['resistencia'], bonus: 3 },
    bloodPotency: { base: 1 },
    hunger: { max: 5 },
  },
  dice: { kind: 'success-threshold', threshold: 6, hungerDice: true },
  actions: [
    { key: 'seducir', label: 'Seducir', traits: ['carisma', 'persuasion'] },
    { key: 'intimidar', label: 'Intimidar', traits: ['fuerza', 'intimidacion'] },
    { key: 'esquivar', label: 'Esquivar', traits: ['destreza', 'atletismo'] },
    { key: 'golpear', label: 'Golpear', traits: ['fuerza', 'pelea'] },
    { key: 'disparar', label: 'Disparar', traits: ['destreza', 'armas-fuego'] },
    { key: 'escabullirse', label: 'Escabullirse', traits: ['destreza', 'sigilo'] },
    {
      key: 'investigar',
      label: 'Investigar una escena',
      traits: ['inteligencia', 'investigacion'],
    },
    { key: 'mentir', label: 'Mentir', traits: ['manipulacion', 'subterfugio'] },
  ],
};
