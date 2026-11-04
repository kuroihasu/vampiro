import { Injectable } from '@nestjs/common';
import {
  type EditionId,
  isEditionId,
  isWikiCategoryId,
  RULESETS,
  WIKI_CATEGORIES,
  type WikiArticle,
  type WikiArticleSummary,
  type WikiCategory,
} from '@vampiro/shared';
import { ApiException } from '../../common/api-exception.js';
import { Prisma, type WikiArticle as WikiArticleRow } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ListArticlesQuery } from './dto/list-articles.query.js';
import type { WikiArticleDto } from './dto/wiki-article.dto.js';

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todas las categorías, en orden fijo, con el número de artículos (0 si no hay). */
  async listCategories(): Promise<WikiCategory[]> {
    const groups = await this.prisma.wikiArticle.groupBy({ by: ['category'], _count: true });
    const counts = new Map(groups.map((g) => [g.category, g._count]));
    return WIKI_CATEGORIES.map((c) => ({ id: c.id, name: c.name, count: counts.get(c.id) ?? 0 }));
  }

  async listArticles(query: ListArticlesQuery): Promise<WikiArticleSummary[]> {
    const where: Prisma.WikiArticleWhereInput = {};
    if (query.categoria) where.category = query.categoria;
    if (query.edicion) where.editions = { has: query.edicion };
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { bodyMarkdown: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.wikiArticle.findMany({
      where,
      orderBy: { title: 'asc' },
      omit: { bodyMarkdown: true, id: true },
    });
    return rows.map(toSummary);
  }

  async getArticle(slug: string): Promise<WikiArticle> {
    const row = await this.prisma.wikiArticle.findUnique({ where: { slug } });
    if (!row) throw notFound(slug);
    return { ...toSummary(row), bodyMarkdown: row.bodyMarkdown };
  }

  async create(dto: WikiArticleDto): Promise<WikiArticle> {
    assertTraitExists(dto);
    try {
      const row = await this.prisma.wikiArticle.create({ data: toData(dto) });
      return { ...toSummary(row), bodyMarkdown: row.bodyMarkdown };
    } catch (error) {
      throw slugConflict(error) ?? error;
    }
  }

  /** Reemplaza el artículo entero; el slug también puede cambiar. */
  async replace(slug: string, dto: WikiArticleDto): Promise<WikiArticle> {
    assertTraitExists(dto);
    try {
      const row = await this.prisma.wikiArticle.update({ where: { slug }, data: toData(dto) });
      return { ...toSummary(row), bodyMarkdown: row.bodyMarkdown };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw notFound(slug);
      }
      throw slugConflict(error) ?? error;
    }
  }

  async remove(slug: string): Promise<void> {
    const { count } = await this.prisma.wikiArticle.deleteMany({ where: { slug } });
    if (count === 0) throw notFound(slug);
  }
}

function toData(dto: WikiArticleDto) {
  return {
    slug: dto.slug,
    title: dto.title,
    category: dto.category,
    editions: dto.editions,
    traitKey: dto.traitKey ?? null,
    bodyMarkdown: dto.bodyMarkdown,
  };
}

/** El rasgo enlazado tiene que existir en el ruleset de alguna de las ediciones del artículo. */
function assertTraitExists(dto: WikiArticleDto): void {
  if (!dto.traitKey) return;
  const exists = dto.editions.some((e) => RULESETS[e]?.catalog.some((t) => t.key === dto.traitKey));
  if (!exists) {
    throw new ApiException(
      400,
      'VALIDATION_ERROR',
      `El rasgo "${dto.traitKey}" no existe en esas ediciones.`,
    );
  }
}

function slugConflict(error: unknown): ApiException | undefined {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    ? new ApiException(409, 'SLUG_EN_USO', 'Ya hay un artículo con ese slug.')
    : undefined;
}

const notFound = (slug: string) =>
  new ApiException(404, 'NO_ENCONTRADO', `No existe el artículo "${slug}".`);

type SummaryRow = Omit<WikiArticleRow, 'bodyMarkdown' | 'id'>;

function toSummary(row: SummaryRow): WikiArticleSummary {
  if (!isWikiCategoryId(row.category)) {
    throw new Error(`Categoría de wiki desconocida en la base: ${row.category}`);
  }
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    editions: row.editions.filter((e): e is EditionId => isEditionId(e)),
    ...(row.traitKey ? { traitKey: row.traitKey } : {}),
    updatedAt: row.updatedAt.toISOString(),
  };
}
