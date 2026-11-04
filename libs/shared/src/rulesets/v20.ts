import type { TraitDefinition } from '../types/trait.js';
import type { Ruleset } from '../types/ruleset.js';

/*
 * Ruleset de V20 (parcial). Los textos son resúmenes propios, no copias de los manuales.
 * Los números de creación siguen el manual de V20 y deben revisarse al completar el catálogo.
 */

const attr = (
  key: string,
  name: string,
  group: string,
  summary: string,
  levels?: string[],
): TraitDefinition => ({
  ...(levels ? { levels } : {}),
  key,
  name,
  category: 'attribute',
  group,
  summary,
  base: 1,
  max: 5,
});

const ability = (
  key: string,
  name: string,
  group: string,
  summary: string,
  levels?: string[],
): TraitDefinition => ({
  ...(levels ? { levels } : {}),
  key,
  name,
  category: 'ability',
  group,
  summary,
  base: 0,
  max: 5,
});

const discipline = (
  key: string,
  name: string,
  summary: string,
  levels?: string[],
): TraitDefinition => ({
  ...(levels ? { levels } : {}),
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

export const V20_RULESET: Ruleset = {
  edition: 'v20',
  version: '2026.11.0',
  catalog: [
    // Atributos
    attr('fuerza', 'Fuerza', 'physical', 'Potencia física bruta: cargar, golpear, romper.', [
      'Débil: te cuesta levantar algo pesado.',
      'Normal: la media de un adulto.',
      'Buena: entrenas o trabajas con el cuerpo.',
      'Excepcional: levantas lo que dos personas juntas.',
      'Extraordinaria: el límite de lo humano.',
    ]),
    attr('destreza', 'Destreza', 'physical', 'Agilidad, coordinación y rapidez de manos.', [
      'Torpe: se te caen las cosas.',
      'Normal: te defiendes sin destacar.',
      'Buena: ágil y de reflejos rápidos.',
      'Excepcional: acróbata o ladrón hábil.',
      'Extraordinaria: cada gesto es preciso.',
    ]),
    attr('resistencia', 'Resistencia', 'physical', 'Aguante físico y capacidad de soportar daño.'),
    attr('carisma', 'Carisma', 'social', 'Capacidad de atraer y caer bien a los demás.'),
    attr('manipulacion', 'Manipulación', 'social', 'Habilidad para influir en otros a tu favor.'),
    attr('apariencia', 'Apariencia', 'social', 'Atractivo físico y primera impresión.'),
    attr('percepcion', 'Percepción', 'mental', 'Atención a los detalles y al entorno.'),
    attr('inteligencia', 'Inteligencia', 'mental', 'Memoria, razonamiento y conocimiento general.'),
    attr('astucia', 'Astucia', 'mental', 'Rapidez mental para reaccionar ante lo imprevisto.'),

    // Talentos
    ability('alerta', 'Alerta', 'talents', 'Notar peligros y cambios a tu alrededor.'),
    ability('atletismo', 'Atletismo', 'talents', 'Correr, saltar, trepar y nadar.'),
    ability('consciencia', 'Consciencia', 'talents', 'Sentir lo sobrenatural.'),
    ability('pelea', 'Pelea', 'talents', 'Combate sin armas.', [
      'Novato: sabes dar un puñetazo.',
      'Practicante: peleas de bar y algo de técnica.',
      'Competente: entrenamiento serio en un estilo.',
      'Experto: pocos te igualan cuerpo a cuerpo.',
      'Maestro: tu estilo es referencia.',
    ]),
    ability('empatia', 'Empatía', 'talents', 'Entender las emociones de otros.'),
    ability(
      'expresion',
      'Expresión',
      'talents',
      'Comunicar ideas de forma convincente o artística.',
    ),
    ability('intimidacion', 'Intimidación', 'talents', 'Imponer miedo o respeto.'),
    ability('liderazgo', 'Liderazgo', 'talents', 'Lograr que otros te sigan.'),
    ability('callejeo', 'Callejeo', 'talents', 'Moverse en los bajos fondos.'),
    ability('subterfugio', 'Subterfugio', 'talents', 'Mentir, ocultar intenciones y engañar.'),

    // Técnicas
    ability(
      'trato-animales',
      'Trato con animales',
      'skills',
      'Calmar, entrenar y entender animales.',
    ),
    ability('artesania', 'Artesanía', 'skills', 'Crear o reparar objetos con las manos.'),
    ability('conducir', 'Conducir', 'skills', 'Manejar vehículos en situaciones difíciles.'),
    ability('etiqueta', 'Etiqueta', 'skills', 'Moverse con soltura en ambientes formales.'),
    ability('armas-fuego', 'Armas de fuego', 'skills', 'Usar y mantener armas de fuego.'),
    ability('latrocinio', 'Latrocinio', 'skills', 'Abrir cerraduras, robar y forzar sistemas.'),
    ability('pelea-armas', 'Pelea con armas', 'skills', 'Combate cuerpo a cuerpo con armas.'),
    ability(
      'interpretacion',
      'Interpretación',
      'skills',
      'Actuar, cantar o tocar ante un público.',
    ),
    ability('sigilo', 'Sigilo', 'skills', 'Moverse sin ser visto ni oído.'),
    ability('supervivencia', 'Supervivencia', 'skills', 'Orientarse y resistir en la naturaleza.'),

    // Conocimientos
    ability('academicismo', 'Academicismo', 'knowledges', 'Humanidades, historia y artes.'),
    ability('informatica', 'Informática', 'knowledges', 'Usar y programar computadores.'),
    ability('finanzas', 'Finanzas', 'knowledges', 'Dinero, negocios y mercados.'),
    ability('investigacion', 'Investigación', 'knowledges', 'Buscar pistas y reconstruir hechos.'),
    ability('leyes', 'Leyes', 'knowledges', 'Sistema legal y burocracia.'),
    ability('medicina', 'Medicina', 'knowledges', 'Anatomía, primeros auxilios y tratamientos.'),
    ability('ocultismo', 'Ocultismo', 'knowledges', 'Saber sobre lo sobrenatural y lo arcano.'),
    ability('politica', 'Política', 'knowledges', 'Poder, facciones e intrigas.'),
    ability('ciencia', 'Ciencia', 'knowledges', 'Ciencias naturales y método científico.'),
    ability('tecnologia', 'Tecnología', 'knowledges', 'Electrónica y dispositivos modernos.'),

    // Disciplinas
    discipline('animalismo', 'Animalismo', 'Comunión y dominio sobre las bestias.'),
    discipline('auspex', 'Auspex', 'Sentidos sobrenaturales y percepción extrasensorial.'),
    discipline('celeridad', 'Celeridad', 'Velocidad sobrehumana.', [
      'Reflejos por encima de cualquier mortal.',
      'Te mueves como un borrón en la penumbra.',
      'Puedes encadenar varias acciones en un instante.',
      'El mundo parece ir a cámara lenta.',
      'Velocidad que desafía al ojo y a la física.',
    ]),
    discipline('demencia', 'Demencia', 'Contagiar la locura a otras mentes.'),
    discipline('dominacion', 'Dominación', 'Imponer la voluntad mediante la mirada y la voz.'),
    discipline('fortaleza', 'Fortaleza', 'Resistencia sobrenatural al daño.'),
    discipline('ofuscacion', 'Ofuscación', 'Pasar desapercibido o volverse invisible.'),
    discipline('potencia', 'Potencia', 'Fuerza sobrehumana.', [
      'Golpeas más fuerte de lo que parece posible.',
      'Doblas metal con las manos.',
      'Atraviesas paredes de ladrillo.',
      'Levantas un coche.',
      'Fuerza digna de un mito.',
    ]),
    discipline('presencia', 'Presencia', 'Atraer, intimidar o fascinar emocionalmente.'),
    discipline('protean', 'Protean', 'Transformar el propio cuerpo.'),
    discipline('taumaturgia', 'Taumaturgia', 'Magia de sangre.'),
    discipline('temporis', 'Temporis', 'Manipular el paso del tiempo.'),

    // Trasfondos
    background('aliados', 'Aliados', 'Mortales que te ayudan.'),
    background('contactos', 'Contactos', 'Fuentes de información.'),
    background('generacion', 'Generación', 'Cercanía a Caín; reduce tu generación.'),
    background('rebano', 'Rebaño', 'Mortales de los que te alimentas con seguridad.'),
    background('influencia', 'Influencia', 'Peso en instituciones mortales.'),
    background('mentor', 'Mentor', 'Un vampiro que te guía y protege.'),
    background('recursos', 'Recursos', 'Dinero y bienes.'),
    background('criados', 'Criados', 'Sirvientes leales.'),
    background('estatus', 'Estatus', 'Reputación en la sociedad vampírica.'),

    // Virtudes
    virtue('conciencia', 'Conciencia', 'Sentido moral; resiste la degeneración.'),
    virtue('autocontrol', 'Autocontrol', 'Dominio sobre la Bestia y el frenesí.'),
    virtue('coraje', 'Coraje', 'Valor ante el fuego, el sol y el miedo.'),

    // Derivados: se calculan de las virtudes y solo suben con puntos gratuitos
    {
      key: 'humanidad',
      name: 'Humanidad',
      category: 'other',
      summary: 'Lo que queda de tu parte humana. Empieza en Conciencia + Autocontrol.',
      base: 0,
      max: 10,
    },
    {
      key: 'voluntad',
      name: 'Fuerza de Voluntad',
      category: 'other',
      summary: 'Determinación para resistir y esforzarse. Empieza en Coraje.',
      base: 0,
      max: 10,
    },
  ],
  clans: [
    {
      key: 'brujah',
      name: 'Brujah',
      disciplines: ['celeridad', 'potencia', 'presencia'],
      weakness: 'Propensos al frenesí por ira.',
    },
    {
      key: 'gangrel',
      name: 'Gangrel',
      disciplines: ['animalismo', 'fortaleza', 'protean'],
      weakness: 'El frenesí les deja rasgos animales.',
    },
    {
      key: 'malkavian',
      name: 'Malkavian',
      disciplines: ['auspex', 'demencia', 'ofuscacion'],
      weakness: 'Todos sufren al menos un trastorno mental.',
    },
    {
      key: 'nosferatu',
      name: 'Nosferatu',
      disciplines: ['animalismo', 'ofuscacion', 'potencia'],
      weakness: 'Deformidad monstruosa; Apariencia 0.',
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
      weakness: 'Vínculo de sangre con su clan.',
    },
    {
      key: 'ventrue',
      name: 'Ventrue',
      disciplines: ['dominacion', 'fortaleza', 'presencia'],
      weakness: 'Solo pueden alimentarse de un tipo de mortal.',
    },
  ],
  creation: {
    priorities: [
      {
        category: 'attribute',
        groups: ['physical', 'social', 'mental'],
        groupLabels: { physical: 'Físicos', social: 'Sociales', mental: 'Mentales' },
        points: [7, 5, 3],
      },
      {
        category: 'ability',
        groups: ['talents', 'skills', 'knowledges'],
        groupLabels: { talents: 'Talentos', skills: 'Técnicas', knowledges: 'Conocimientos' },
        points: [13, 9, 5],
        maxPerTraitAtCreation: 3,
      },
    ],
    fixed: [
      { category: 'discipline', label: 'Disciplinas', points: 3, clanOnly: true },
      { category: 'background', label: 'Trasfondos', points: 5 },
      { category: 'virtue', label: 'Virtudes', points: 7 },
    ],
  },
  freebies: {
    total: 15,
    costs: { attribute: 5, ability: 2, discipline: 7, background: 1, virtue: 2 },
    traitCosts: { humanidad: 2, voluntad: 1 },
  },
  meritsFlaws: { maxFlawPoints: 7 },
  derived: {
    humanity: { from: ['conciencia', 'autocontrol'], traitKey: 'humanidad', max: 10 },
    willpower: { from: ['coraje'], traitKey: 'voluntad', max: 10 },
    generation: { base: 13, min: 8, backgroundKey: 'generacion' },
    bloodPool: {
      13: { max: 10, perTurn: 1 },
      12: { max: 11, perTurn: 1 },
      11: { max: 12, perTurn: 1 },
      10: { max: 13, perTurn: 1 },
      9: { max: 14, perTurn: 2 },
      8: { max: 15, perTurn: 3 },
    },
  },
  dice: { kind: 'difficulty', minDifficulty: 2, maxDifficulty: 10, onesCancel: true },
  actions: [
    { key: 'seducir', label: 'Seducir', traits: ['apariencia', 'subterfugio'] },
    { key: 'intimidar', label: 'Intimidar', traits: ['fuerza', 'intimidacion'] },
    { key: 'esquivar', label: 'Esquivar', traits: ['destreza', 'atletismo'] },
    { key: 'golpear', label: 'Golpear', traits: ['destreza', 'pelea'] },
    { key: 'disparar', label: 'Disparar', traits: ['destreza', 'armas-fuego'] },
    { key: 'escabullirse', label: 'Escabullirse', traits: ['destreza', 'sigilo'] },
    { key: 'investigar', label: 'Investigar una escena', traits: ['percepcion', 'investigacion'] },
  ],
};
