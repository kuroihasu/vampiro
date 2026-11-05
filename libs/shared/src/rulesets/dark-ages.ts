import type { Ruleset } from '../types/ruleset.js';
import type { TraitDefinition } from '../types/trait.js';
import { V20_RULESET } from './v20.js';

/*
 * Ruleset de Vampiro: Edad Oscura. Reutiliza el motor y los presupuestos de V20
 * (prioridades 7/5/3 y 13/9/5, 3 disciplinas, 5 trasfondos, 7 virtudes, 15 gratuitos)
 * con las diferencias de la época: Caminos en lugar de Humanidad, virtudes según el
 * Camino y habilidades medievales. Textos propios. Números por revisar contra el manual,
 * sobre todo la generación inicial (12ª) y la tabla de sangre.
 * Pendiente: méritos y defectos propios de la época.
 */

const fromV20 = (keys: string[]): TraitDefinition[] =>
  keys.map((key) => {
    const trait = V20_RULESET.catalog.find((t) => t.key === key);
    if (!trait) throw new Error(`Rasgo de V20 inexistente: ${key}`);
    return trait;
  });

const ability = (key: string, name: string, group: string, summary: string): TraitDefinition => ({
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

const virtue = (key: string, name: string, summary: string): TraitDefinition => ({
  key,
  name,
  category: 'virtue',
  summary,
  base: 1,
  max: 5,
});

export const DARK_AGES_RULESET: Ruleset = {
  ...V20_RULESET,
  edition: 'dark-ages',
  version: '2026.11.0',
  catalog: [
    // Los nueve atributos son los mismos que en V20
    ...fromV20([
      'fuerza',
      'destreza',
      'resistencia',
      'carisma',
      'manipulacion',
      'apariencia',
      'percepcion',
      'inteligencia',
      'astucia',
    ]),

    // Talentos
    ability('alerta', 'Alerta', 'talents', 'Notar el peligro antes de que llegue.'),
    ability('atletismo', 'Atletismo', 'talents', 'Correr, trepar, nadar y saltar.'),
    ability('consciencia', 'Consciencia', 'talents', 'Sentir lo sobrenatural.'),
    ability('pelea', 'Pelea', 'talents', 'Puños, codos y dientes.'),
    ability('empatia', 'Empatía', 'talents', 'Entender lo que sienten los demás.'),
    ability('expresion', 'Expresión', 'talents', 'Hablar, escribir o cantar con fuerza.'),
    ability('intimidacion', 'Intimidación', 'talents', 'Hacer que te teman.'),
    ability('liderazgo', 'Liderazgo', 'talents', 'Que otros te sigan a la batalla o al consejo.'),
    ability('juego-de-manos', 'Juego de manos', 'talents', 'Robar bolsas y hacer trucos.'),
    ability('subterfugio', 'Subterfugio', 'talents', 'Mentir y guardar secretos.'),
    // Técnicas
    ability('trato-animales', 'Trato con animales', 'skills', 'Perros, halcones y caballos.'),
    ability('arqueria', 'Arquería', 'skills', 'Arco y ballesta.'),
    ability('artesania', 'Artesanía', 'skills', 'Herrería, carpintería, cantería…'),
    ability('etiqueta', 'Etiqueta', 'skills', 'Moverse en la corte sin ofender.'),
    ability('pelea-armas', 'Pelea con armas', 'skills', 'Espada, hacha, lanza y maza.'),
    ability('interpretacion', 'Interpretación', 'skills', 'Música, poesía y teatro.'),
    ability('cabalgar', 'Cabalgar', 'skills', 'Montar y combatir a caballo.'),
    ability('sigilo', 'Sigilo', 'skills', 'Moverse sin ser visto.'),
    ability('supervivencia', 'Supervivencia', 'skills', 'Valerse en bosques y caminos.'),
    // Conocimientos
    ability('academicismo', 'Academicismo', 'knowledges', 'Latín, teología y artes liberales.'),
    ability('enigmas', 'Enigmas', 'knowledges', 'Resolver acertijos y misterios.'),
    ability('investigacion', 'Investigación', 'knowledges', 'Seguir pistas y descubrir culpables.'),
    ability('leyes', 'Leyes', 'knowledges', 'Derecho canónico, feudal y costumbres.'),
    ability('medicina', 'Medicina', 'knowledges', 'Hierbas, sangrías y huesos.'),
    ability('ocultismo', 'Ocultismo', 'knowledges', 'Saber prohibido y supersticiones.'),
    ability('politica', 'Política', 'knowledges', 'Alianzas, linajes y feudos.'),
    ability(
      'sabiduria-popular',
      'Sabiduría popular',
      'knowledges',
      'Remedios, refranes y costumbres del pueblo.',
    ),
    ability('senescal', 'Senescal', 'knowledges', 'Administrar tierras, rentas y siervos.'),

    // Disciplinas
    discipline('animalismo', 'Animalismo', 'Mandar sobre las bestias.'),
    discipline('auspex', 'Auspex', 'Sentidos más allá de lo humano.'),
    discipline('celeridad', 'Celeridad', 'Velocidad sobrenatural.'),
    discipline('dementacion', 'Dementación', 'Contagiar la locura.'),
    discipline('dominacion', 'Dominación', 'Imponer la voluntad a otras mentes.'),
    discipline('fortaleza', 'Fortaleza', 'Resistir lo que mataría a otros.'),
    discipline('mortis', 'Mortis', 'El poder sobre la muerte y los cadáveres.'),
    discipline('obtenebracion', 'Obtenebración', 'Dar forma a las sombras.'),
    discipline('ofuscacion', 'Ofuscación', 'Pasar desapercibido.'),
    discipline('potencia', 'Potencia', 'Fuerza sobrenatural.'),
    discipline('presencia', 'Presencia', 'Fascinar o aterrar.'),
    discipline('protean', 'Protean', 'Cambiar de forma.'),
    discipline('taumaturgia', 'Taumaturgia', 'Hechicería de la sangre.'),

    // Trasfondos
    background('aliados', 'Aliados', 'Mortales que te ayudan.'),
    background('contactos', 'Contactos', 'Gente que te trae noticias.'),
    background('dominio', 'Dominio', 'Tierras o barrios donde cazas con derecho.'),
    background('generacion', 'Generación', 'Cercanía a Caín; reduce tu generación.'),
    background('rebano', 'Rebaño', 'Mortales de los que te alimentas.'),
    background('influencia', 'Influencia', 'Peso ante señores, obispos o gremios.'),
    background('mentor', 'Mentor', 'Un antiguo que te protege.'),
    background('recursos', 'Recursos', 'Riquezas, tierras y rentas.'),
    background('criados', 'Criados', 'Siervos leales.'),
    background('estatus', 'Estatus', 'Prestigio entre los Cainitas.'),

    // Virtudes: cada Camino usa dos de las cuatro, además del Coraje
    virtue('conciencia', 'Conciencia', 'Juzgar el bien y el mal según la moral humana.'),
    virtue('conviccion', 'Convicción', 'Firmeza en las creencias de tu Camino.'),
    virtue('autocontrol', 'Autocontrol', 'Dominar a la Bestia.'),
    virtue('instinto', 'Instinto', 'Cabalgar a la Bestia en lugar de negarla.'),
    virtue('coraje', 'Coraje', 'Valor ante el fuego, el sol y el miedo.'),

    // Derivados: solo suben con puntos gratuitos
    {
      key: 'camino',
      name: 'Camino',
      category: 'other',
      summary: 'Tu moral: la suma de las dos virtudes de tu Camino.',
      base: 0,
      max: 10,
    },
    {
      key: 'voluntad',
      name: 'Fuerza de Voluntad',
      category: 'other',
      summary: 'Determinación para resistir. Empieza en Coraje.',
      base: 0,
      max: 10,
    },
  ],
  clans: [
    {
      key: 'brujah',
      name: 'Brujah',
      disciplines: ['celeridad', 'potencia', 'presencia'],
      weakness: 'La ira los domina con facilidad.',
    },
    {
      key: 'capadocio',
      name: 'Capadocio',
      disciplines: ['auspex', 'fortaleza', 'mortis'],
      weakness: 'Su piel es pálida como la de un cadáver.',
    },
    {
      key: 'gangrel',
      name: 'Gangrel',
      disciplines: ['animalismo', 'fortaleza', 'protean'],
      weakness: 'El frenesí les deja rasgos animales.',
    },
    {
      key: 'lasombra',
      name: 'Lasombra',
      disciplines: ['dominacion', 'obtenebracion', 'potencia'],
      weakness: 'No se reflejan en espejos ni en el agua.',
    },
    {
      key: 'malkavian',
      name: 'Malkavian',
      disciplines: ['auspex', 'dementacion', 'ofuscacion'],
      weakness: 'Todos arrastran alguna locura.',
    },
    {
      key: 'nosferatu',
      name: 'Nosferatu',
      disciplines: ['animalismo', 'ofuscacion', 'potencia'],
      weakness: 'Deformidad monstruosa.',
    },
    {
      key: 'toreador',
      name: 'Toreador',
      disciplines: ['auspex', 'celeridad', 'presencia'],
      weakness: 'Quedan absortos ante la belleza.',
    },
    {
      key: 'tremere',
      name: 'Tremere',
      disciplines: ['auspex', 'dominacion', 'taumaturgia'],
      weakness: 'Odiados por los demás clanes; su sangre les ata a su capilla.',
    },
    {
      key: 'ventrue',
      name: 'Ventrue',
      disciplines: ['dominacion', 'fortaleza', 'presencia'],
      weakness: 'Solo les nutre un tipo de mortal.',
    },
  ],
  creation: {
    priorities: V20_RULESET.creation.priorities,
    fixed: V20_RULESET.creation.fixed,
  },
  freebies: {
    total: 15,
    costs: { attribute: 5, ability: 2, discipline: 7, background: 1, virtue: 2 },
    traitCosts: { camino: 2, voluntad: 1 },
  },
  // Méritos y defectos de la época: pendientes.
  meritsFlaws: undefined,
  roads: {
    sharedVirtues: ['coraje'],
    options: [
      {
        key: 'humanidad',
        name: 'Camino de la Humanidad',
        summary: 'Aferrarse a lo que queda del hombre o la mujer que fuiste.',
        virtues: ['conciencia', 'autocontrol'],
      },
      {
        key: 'cielo',
        name: 'Camino del Cielo',
        summary: 'Servir a Dios como su azote y su penitente.',
        virtues: ['conciencia', 'autocontrol'],
      },
      {
        key: 'reyes',
        name: 'Camino de los Reyes',
        summary: 'Gobernar con justicia y lealtad: el poder obliga.',
        virtues: ['conviccion', 'autocontrol'],
      },
      {
        key: 'bestia',
        name: 'Camino de la Bestia',
        summary: 'Aceptar que eres un depredador y vivir como tal.',
        virtues: ['conviccion', 'instinto'],
      },
      {
        key: 'pecado',
        name: 'Camino del Pecado',
        summary: 'Abrazar el deseo y la transgresión sin culpa.',
        virtues: ['conviccion', 'instinto'],
      },
    ],
  },
  derived: {
    humanity: { from: [], traitKey: 'camino', max: 10 },
    willpower: { from: ['coraje'], traitKey: 'voluntad', max: 10 },
    generation: { base: 12, min: 7, backgroundKey: 'generacion' },
    bloodPool: {
      12: { max: 11, perTurn: 1 },
      11: { max: 12, perTurn: 1 },
      10: { max: 13, perTurn: 1 },
      9: { max: 14, perTurn: 2 },
      8: { max: 15, perTurn: 3 },
      7: { max: 20, perTurn: 4 },
    },
  },
  dice: V20_RULESET.dice,
  actions: [
    { key: 'seducir', label: 'Seducir', traits: ['apariencia', 'expresion'] },
    { key: 'intimidar', label: 'Intimidar', traits: ['fuerza', 'intimidacion'] },
    { key: 'esquivar', label: 'Esquivar', traits: ['destreza', 'atletismo'] },
    { key: 'golpear', label: 'Golpear', traits: ['destreza', 'pelea'] },
    { key: 'espada', label: 'Atacar con arma', traits: ['destreza', 'pelea-armas'] },
    { key: 'disparar-arco', label: 'Disparar con arco', traits: ['destreza', 'arqueria'] },
    { key: 'cabalgar', label: 'Cabalgar al galope', traits: ['destreza', 'cabalgar'] },
    { key: 'arengar', label: 'Arengar a la tropa', traits: ['carisma', 'liderazgo'] },
  ],
};
