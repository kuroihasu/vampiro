import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListArticlesQuery } from './list-articles.query.js';

const errorsFor = (plain: object) =>
  validateSync(plainToInstance(ListArticlesQuery, plain)).map((e) => e.property);

describe('ListArticlesQuery', () => {
  it('acepta una consulta vacía', () => {
    expect(errorsFor({})).toEqual([]);
  });

  it('acepta categoría, edición y búsqueda válidas', () => {
    expect(errorsFor({ categoria: 'clanes', edicion: 'v20', q: 'brujah' })).toEqual([]);
  });

  it('rechaza categoría y edición desconocidas', () => {
    expect(errorsFor({ categoria: 'hechizos', edicion: 'v99' })).toEqual(['categoria', 'edicion']);
  });

  it('recorta la búsqueda y limita su longitud', () => {
    const query = plainToInstance(ListArticlesQuery, { q: '  celeridad  ' });
    expect(query.q).toBe('celeridad');
    expect(errorsFor({ q: 'x'.repeat(101) })).toEqual(['q']);
  });
});
