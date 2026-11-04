import { lexer, type Token, type Tokens } from 'marked';

/*
 * Markdown → árbol propio. La vista lo pinta con plantillas de Angular (interpolación),
 * nunca con innerHTML: el HTML incrustado se muestra como texto y solo se aceptan
 * enlaces internos, http(s) y menciones de rasgo (`rasgo:clave`).
 */

export type MdInline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'br' }
  | { kind: 'strong' | 'em' | 'del'; children: MdInline[] }
  | { kind: 'trait'; key: string; label: string }
  | { kind: 'internal'; path: string; children: MdInline[] }
  | { kind: 'external'; href: string; children: MdInline[] };

export type MdBlock =
  | { kind: 'heading'; level: 2 | 3 | 4; children: MdInline[] }
  | { kind: 'paragraph'; children: MdInline[] }
  | { kind: 'list'; ordered: boolean; items: MdBlock[][] }
  | { kind: 'quote'; children: MdBlock[] }
  | { kind: 'code'; text: string }
  | { kind: 'rule' };

const TRAIT_LINK = /^rasgo:([a-z0-9-]+)$/;

export function parseMarkdown(source: string): MdBlock[] {
  return toBlocks(lexer(source));
}

function toBlocks(tokens: Token[]): MdBlock[] {
  const blocks: MdBlock[] = [];
  for (const token of tokens) {
    const block = toBlock(token);
    if (block) blocks.push(block);
  }
  return blocks;
}

function toBlock(token: Token): MdBlock | undefined {
  switch (token.type) {
    case 'heading': {
      const t = token as Tokens.Heading;
      const level = Math.min(4, Math.max(2, t.depth + 1)) as 2 | 3 | 4;
      return { kind: 'heading', level, children: toInlines(t.tokens) };
    }
    case 'paragraph':
      return { kind: 'paragraph', children: toInlines((token as Tokens.Paragraph).tokens) };
    case 'text': {
      // Texto suelto de bloque (p. ej. dentro de un elemento de lista "apretada").
      const t = token as Tokens.Text;
      return { kind: 'paragraph', children: t.tokens ? toInlines(t.tokens) : [text(t.text)] };
    }
    case 'list': {
      const t = token as Tokens.List;
      return { kind: 'list', ordered: t.ordered, items: t.items.map((i) => toBlocks(i.tokens)) };
    }
    case 'blockquote':
      return { kind: 'quote', children: toBlocks((token as Tokens.Blockquote).tokens) };
    case 'code':
      return { kind: 'code', text: (token as Tokens.Code).text };
    case 'hr':
      return { kind: 'rule' };
    case 'html':
      return { kind: 'paragraph', children: [text((token as Tokens.HTML).text.trim())] };
    case 'space':
      return undefined;
    default:
      return 'raw' in token && token.raw.trim()
        ? { kind: 'paragraph', children: [text(token.raw.trim())] }
        : undefined;
  }
}

function toInlines(tokens: Token[] = []): MdInline[] {
  return mergeText(tokens.flatMap(toInline));
}

function toInline(token: Token): MdInline[] {
  switch (token.type) {
    case 'text': {
      const t = token as Tokens.Text;
      return t.tokens ? toInlines(t.tokens) : [text(t.text)];
    }
    case 'escape':
      return [text((token as Tokens.Escape).text)];
    case 'strong':
    case 'em':
    case 'del':
      return [{ kind: token.type, children: toInlines((token as Tokens.Strong).tokens) }];
    case 'codespan':
      return [{ kind: 'code', text: (token as Tokens.Codespan).text }];
    case 'br':
      return [{ kind: 'br' }];
    case 'link':
      return toLink(token as Tokens.Link);
    case 'image':
      return [text((token as Tokens.Image).text)];
    case 'html':
      return [text((token as Tokens.HTML).raw)];
    default:
      return 'raw' in token ? [text(token.raw)] : [];
  }
}

function toLink(token: Tokens.Link): MdInline[] {
  const children = toInlines(token.tokens);
  const href = token.href.trim();
  const trait = TRAIT_LINK.exec(href);
  if (trait) return [{ kind: 'trait', key: trait[1]!, label: plainText(children) }];
  if (href.startsWith('/') && !href.startsWith('//'))
    return [{ kind: 'internal', path: href, children }];
  if (/^https?:\/\//i.test(href)) return [{ kind: 'external', href, children }];
  // Cualquier otro esquema (javascript:, data:, //host…) se queda en texto.
  return children;
}

/** El lexer devuelve el texto en trozos; se unen los consecutivos y se decodifican entidades. */
function mergeText(nodes: MdInline[]): MdInline[] {
  const merged: MdInline[] = [];
  for (const node of nodes) {
    const last = merged.at(-1);
    if (node.kind === 'text' && last?.kind === 'text') last.text += node.text;
    else merged.push(node.kind === 'text' ? { ...node } : node);
  }
  return merged;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

function text(value: string): MdInline {
  return { kind: 'text', text: value.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m]!) };
}

/** Texto plano de una lista de nodos (la etiqueta de una mención de rasgo). */
function plainText(nodes: MdInline[]): string {
  return nodes
    .map((n) => ('text' in n ? n.text : 'children' in n ? plainText(n.children) : ''))
    .join('')
    .trim();
}
