import { EDITION_IDS, type EditionId, WIKI_CATEGORIES, type WikiCategoryId } from '@vampiro/shared';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../../common/transforms.js';

/** Filtros de GET /wiki/articles (?categoria=&edicion=&q=). */
export class ListArticlesQuery {
  @IsOptional()
  @IsIn(WIKI_CATEGORIES.map((c) => c.id))
  categoria?: WikiCategoryId;

  @IsOptional()
  @IsIn(EDITION_IDS)
  edicion?: EditionId;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;
}
