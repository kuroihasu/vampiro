import { RulesService } from './rules.service.js';
import { ApiException } from '../../common/api-exception.js';

describe('RulesService', () => {
  const service = new RulesService();

  it('devuelve el ruleset de V20', () => {
    expect(service.getRuleset('v20').edition).toBe('v20');
  });

  it('responde EDICION_NO_DISPONIBLE para una edición sin ruleset', () => {
    expect(() => service.getRuleset('revised')).toThrow(ApiException);
  });

  it('busca un rasgo para los tooltips', () => {
    expect(service.getTrait('v20', 'celeridad').name).toBe('Celeridad');
  });
});
