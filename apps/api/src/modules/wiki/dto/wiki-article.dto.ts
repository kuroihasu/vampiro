import {
  EDITION_IDS,
  type EditionId,
  WIKI_BODY_MAX_LENGTH,
  WIKI_CATEGORIES,
  WIKI_SLUG_PATTERN,
  WIKI_TITLE_MAX_LENGTH,
  type WikiArticleInput,
  type WikiCategoryId,
} from '@vampiro/shared';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../../common/transforms.js';

export class WikiArticleDto implements WikiArticleInput {
  @Trim()
  @IsString()
  @Length(1, 80)
  @Matches(WIKI_SLUG_PATTERN, { message: 'slug: solo minúsculas, números y guiones' })
  slug!: string;

  @Trim()
  @IsString()
  @Length(1, WIKI_TITLE_MAX_LENGTH)
  title!: string;

  @IsIn(WIKI_CATEGORIES.map((c) => c.id))
  category!: WikiCategoryId;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(EDITION_IDS.length)
  @ArrayUnique()
  @IsIn(EDITION_IDS, { each: true })
  editions!: EditionId[];

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{1,40}$/)
  traitKey?: string;

  @IsString()
  @Length(1, WIKI_BODY_MAX_LENGTH)
  @MaxLength(WIKI_BODY_MAX_LENGTH)
  bodyMarkdown!: string;
}
