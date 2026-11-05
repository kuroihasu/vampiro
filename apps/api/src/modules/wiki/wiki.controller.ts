import { Controller, Get, Param, Query } from '@nestjs/common';
import type { WikiArticle, WikiArticleSummary, WikiCategory } from '@vampiro/shared';
import { Public } from '../../common/auth/public.decorator.js';
import { ListArticlesQuery } from './dto/list-articles.query.js';
import { WikiService } from './wiki.service.js';

/** Wiki de solo lectura y pública. */
@Public()
@Controller('wiki')
export class WikiController {
  constructor(private readonly wiki: WikiService) {}

  @Get('categories')
  categories(): Promise<WikiCategory[]> {
    return this.wiki.listCategories();
  }

  @Get('articles')
  articles(@Query() query: ListArticlesQuery): Promise<WikiArticleSummary[]> {
    return this.wiki.listArticles(query);
  }

  @Get('articles/:slug')
  article(@Param('slug') slug: string): Promise<WikiArticle> {
    return this.wiki.getArticle(slug);
  }
}
