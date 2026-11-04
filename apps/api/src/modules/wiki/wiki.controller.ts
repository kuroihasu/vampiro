import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { WikiArticle, WikiArticleSummary, WikiCategory } from '@vampiro/shared';
import { Public } from '../../common/auth/public.decorator.js';
import { Roles, RolesGuard } from '../../common/auth/roles.js';
import { ListArticlesQuery } from './dto/list-articles.query.js';
import { WikiArticleDto } from './dto/wiki-article.dto.js';
import { WikiService } from './wiki.service.js';

/** Wiki: lectura pública; crear, editar y borrar solo para administradores. */
@Controller('wiki')
export class WikiController {
  constructor(private readonly wiki: WikiService) {}

  @Public()
  @Get('categories')
  categories(): Promise<WikiCategory[]> {
    return this.wiki.listCategories();
  }

  @Public()
  @Get('articles')
  articles(@Query() query: ListArticlesQuery): Promise<WikiArticleSummary[]> {
    return this.wiki.listArticles(query);
  }

  @Public()
  @Get('articles/:slug')
  article(@Param('slug') slug: string): Promise<WikiArticle> {
    return this.wiki.getArticle(slug);
  }

  @Post('articles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: WikiArticleDto): Promise<WikiArticle> {
    return this.wiki.create(dto);
  }

  @Put('articles/:slug')
  @UseGuards(RolesGuard)
  @Roles('admin')
  replace(@Param('slug') slug: string, @Body() dto: WikiArticleDto): Promise<WikiArticle> {
    return this.wiki.replace(slug, dto);
  }

  @Delete('articles/:slug')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('slug') slug: string): Promise<void> {
    return this.wiki.remove(slug);
  }
}
