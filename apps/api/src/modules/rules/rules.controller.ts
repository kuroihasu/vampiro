import { Controller, Get, Param } from '@nestjs/common';
import { RulesService } from './rules.service.js';

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
