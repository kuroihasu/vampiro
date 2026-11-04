import { parseMarkdown } from './parse-markdown';

describe('parseMarkdown', () => {
  it('convierte encabezados empezando en h2 (el h1 es el título del artículo)', () => {
    expect(parseMarkdown('# Uno\n\n## Dos\n\n#### Cuatro')).toEqual([
      { kind: 'heading', level: 2, children: [{ kind: 'text', text: 'Uno' }] },
      { kind: 'heading', level: 3, children: [{ kind: 'text', text: 'Dos' }] },
      { kind: 'heading', level: 4, children: [{ kind: 'text', text: 'Cuatro' }] },
    ]);
  });

  it('párrafos con énfasis y negrita', () => {
    expect(parseMarkdown('Un *vástago* **antiguo**.')).toEqual([
      {
        kind: 'paragraph',
        children: [
          { kind: 'text', text: 'Un ' },
          { kind: 'em', children: [{ kind: 'text', text: 'vástago' }] },
          { kind: 'text', text: ' ' },
          { kind: 'strong', children: [{ kind: 'text', text: 'antiguo' }] },
          { kind: 'text', text: '.' },
        ],
      },
    ]);
  });

  it('los enlaces rasgo:clave se convierten en menciones de rasgo', () => {
    const [p] = parseMarkdown('Usa [Celeridad](rasgo:celeridad).');
    expect(p).toEqual({
      kind: 'paragraph',
      children: [
        { kind: 'text', text: 'Usa ' },
        { kind: 'trait', key: 'celeridad', children: [{ kind: 'text', text: 'Celeridad' }] },
        { kind: 'text', text: '.' },
      ],
    });
  });

  it('distingue enlaces internos y externos', () => {
    const [p] = parseMarkdown('[Brujah](/wiki/clan-brujah) y [web](https://example.com)');
    expect(p).toMatchObject({
      children: [
        { kind: 'internal', path: '/wiki/clan-brujah' },
        { kind: 'text', text: ' y ' },
        { kind: 'external', href: 'https://example.com' },
      ],
    });
  });

  it('descarta enlaces peligrosos y deja solo su texto', () => {
    const [p] = parseMarkdown('[clic](javascript:alert(1)) [otro](//evil.example)');
    expect(p).toEqual({
      kind: 'paragraph',
      children: [{ kind: 'text', text: 'clic otro' }],
    });
  });

  it('el HTML incrustado se trata como texto, nunca como marcado', () => {
    const blocks = parseMarkdown('<script>alert(1)</script>\n\nHola <b>mundo</b>');
    expect(JSON.stringify(blocks)).not.toContain('"kind":"html"');
    expect(blocks[0]).toEqual({
      kind: 'paragraph',
      children: [{ kind: 'text', text: '<script>alert(1)</script>' }],
    });
  });

  it('listas, citas, código y separadores', () => {
    const blocks = parseMarkdown('- uno\n- dos\n\n> cita\n\n---\n\n`x`');
    expect(blocks.map((b) => b.kind)).toEqual(['list', 'quote', 'rule', 'paragraph']);
    expect(blocks[0]).toMatchObject({
      kind: 'list',
      ordered: false,
      items: [
        [{ kind: 'paragraph', children: [{ kind: 'text', text: 'uno' }] }],
        [{ kind: 'paragraph', children: [{ kind: 'text', text: 'dos' }] }],
      ],
    });
    expect(blocks[3]).toEqual({ kind: 'paragraph', children: [{ kind: 'code', text: 'x' }] });
  });
});
