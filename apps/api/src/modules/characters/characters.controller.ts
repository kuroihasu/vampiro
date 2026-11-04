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
} from '@nestjs/common';
import type { Character, CharacterSummary } from '@vampiro/shared';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { type CharacterEvaluation, CharactersService } from './characters.service.js';
import {
  CreateCharacterDto,
  EvaluateCharacterDto,
  ListCharactersQuery,
  UpdateCharacterDto,
} from './dto/character.dto.js';

/** Fichas del usuario autenticado. */
@Controller('characters')
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCharactersQuery,
  ): Promise<CharacterSummary[]> {
    return this.characters.list(user.id, query.edicion);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCharacterDto): Promise<Character> {
    return this.characters.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Character> {
    return this.characters.get(user.id, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCharacterDto,
  ): Promise<Character> {
    return this.characters.update(user.id, id, dto);
  }

  @Post(':id/evaluate')
  @HttpCode(HttpStatus.OK)
  evaluate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: EvaluateCharacterDto,
  ): Promise<CharacterEvaluation> {
    return this.characters.evaluate(user.id, id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Character> {
    return this.characters.complete(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.characters.remove(user.id, id);
  }
}
