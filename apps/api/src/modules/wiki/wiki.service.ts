import { Injectable } from '@nestjs/common';
import {
  type EditionId,
  isEditionId,
  isWikiCategoryId,
  WIKI_CATEGORIES,
  type WikiArticle,
  type WikiArticleSummary,
  type WikiCategory,
} from '@vampiro/shared';
import { ApiException } from '../../common/api-exception.js';
import type { Prisma, WikiArticle as WikiArticleRow } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ListArticlesQuery } from './dto/list-articles.query.js';

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
    if (!row) throw new ApiException(404, 'NO_ENCONTRADO', `No existe el artículo "${slug}".`);
    return { ...toSummary(row), bodyMarkdown: row.bodyMarkdown };
  }
}

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
