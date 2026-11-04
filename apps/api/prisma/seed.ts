/*
 * Datos iniciales de la wiki (textos propios, resumidos; no son copias de los manuales).
 * Los enlaces `[Nombre](rasgo:clave)` se muestran en la web como tooltips del ruleset.
 * Se puede ejecutar varias veces: hace upsert por slug.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

interface SeedArticle {
  slug: string;
  title: string;
  category: string;
  editions: string[];
  traitKey?: string;
  bodyMarkdown: string;
}

const ARTICLES: SeedArticle[] = [
  {
    slug: 'clan-brujah',
    title: 'Brujah',
    category: 'clanes',
    editions: ['v20'],
    bodyMarkdown: `Los Brujah fueron eruditos y guerreros-filósofos; hoy muchos son rebeldes que desconfían de cualquier autoridad.

## Disciplinas de clan

- [Celeridad](rasgo:celeridad)
- [Potencia](rasgo:potencia)
- [Presencia](rasgo:presencia)

## Debilidad

Su pasión los vuelve propensos al frenesí cuando algo los enfurece. Resistirlo es más difícil que para otros Vástagos.

## Para jugarlos

Funcionan bien con [Fuerza](rasgo:fuerza) y [Pelea](rasgo:pelea) altas, pero un Brujah idealista con mucha [Inteligencia](rasgo:inteligencia) es igual de fiel a su historia.`,
  },
  {
    slug: 'disciplina-celeridad',
    title: 'Celeridad',
    category: 'disciplinas',
    editions: ['v20'],
    traitKey: 'celeridad',
    bodyMarkdown: `La sangre acelera el cuerpo del vampiro más allá de lo humano.

## En juego

Cada punto permite moverse y reaccionar más rápido. Gastando sangre, el personaje puede realizar acciones adicionales en el mismo turno.

## Combina con

- [Destreza](rasgo:destreza), para acertar lo que la velocidad permite intentar.
- [Atletismo](rasgo:atletismo), para persecuciones y huidas.

Es disciplina de clan de los [Brujah](/wiki/clan-brujah) y los Toreador.`,
  },
  {
    slug: 'disciplina-potencia',
    title: 'Potencia',
    category: 'disciplinas',
    editions: ['v20'],
    traitKey: 'potencia',
    bodyMarkdown: `Fuerza sobrenatural: el vampiro golpea, levanta y rompe muy por encima de sus músculos.

## En juego

Añade éxitos automáticos a las tiradas de [Fuerza](rasgo:fuerza), incluido el daño cuerpo a cuerpo.

> Un éxito automático no se puede cancelar con unos.`,
  },
  {
    slug: 'atributo-fuerza',
    title: 'Fuerza',
    category: 'atributos',
    editions: ['v20'],
    traitKey: 'fuerza',
    bodyMarkdown: `Atributo físico que mide la potencia muscular.

## Se usa para

- Golpear con [Pelea](rasgo:pelea) o con armas cuerpo a cuerpo.
- Levantar, empujar o romper objetos.
- Intimidar físicamente, junto a Intimidación.

Todo personaje empieza con un punto. Al crearlo, se reparte según la prioridad elegida para los atributos físicos.`,
  },
  {
    slug: 'trasfondo-recursos',
    title: 'Recursos',
    category: 'trasfondos',
    editions: ['v20'],
    traitKey: 'recursos',
    bodyMarkdown: `Dinero, propiedades e ingresos de los que dispone el personaje.

Con cero puntos vive al día; con cinco, maneja una fortuna. Los Recursos no son dinero en el bolsillo: representan lo que puede conseguir sin llamar la atención en un plazo razonable.`,
  },
  {
    slug: 'regla-reserva-de-dados',
    title: 'Reserva de dados y dificultad',
    category: 'reglas',
    editions: ['v20'],
    bodyMarkdown: `En V20 se tiran tantos d10 como la suma de un atributo y una habilidad, por ejemplo [Destreza](rasgo:destreza) + [Pelea](rasgo:pelea) para golpear.

## Éxitos

- Cada dado igual o superior a la **dificultad** (normalmente 6) es un éxito.
- Cada 1 resta un éxito.
- Sin éxitos y con algún 1, la tirada es un **fracaso crítico**.

## Dificultad

Va de 2 a 10. El narrador la sube o la baja según lo complicado de la acción.`,
  },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

try {
  for (const article of ARTICLES) {
    const data = { ...article, traitKey: article.traitKey ?? null };
    await prisma.wikiArticle.upsert({ where: { slug: article.slug }, create: data, update: data });
  }
  console.log(`Wiki: ${ARTICLES.length} artículos cargados.`);
} finally {
  await prisma.$disconnect();
}
