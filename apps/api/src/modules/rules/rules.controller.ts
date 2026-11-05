import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/auth/public.decorator.js';
import { RulesService } from './rules.service.js';

/** Rulesets públicos: los usan la wiki y los tooltips sin sesión. */
@Public()
@Controller()
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Get('editions')
  listEditions() {
    return this.rules.listEditions();
  }

  @Get('rulesets/:edition')
  getRuleset(@Param('edition') edition: string) {
    return this.rules.getRuleset(edition);
  }

  @Get('traits/:edition/:key')
  getTrait(@Param('edition') edition: string, @Param('key') key: string) {
    return this.rules.getTrait(edition, key);
  }
}
