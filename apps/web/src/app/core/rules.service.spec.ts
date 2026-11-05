import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EDITIONS, V20_RULESET } from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';
import { RulesService } from './rules.service';

describe('RulesService', () => {
  let service: RulesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RulesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('guarda las ediciones cargadas en la señal', async () => {
    const loaded = firstValueFrom(service.loadEditions());
    http.expectOne('/api/v1/editions').flush(EDITIONS);
    await loaded;
    expect(service.editions()).toEqual(EDITIONS);
  });

  it('pide cada ruleset una sola vez', async () => {
    const first = firstValueFrom(service.ruleset('v20'));
    http.expectOne('/api/v1/rulesets/v20').flush(V20_RULESET);
    expect((await first).edition).toBe('v20');

    const second = await firstValueFrom(service.ruleset('v20'));
    expect(second.edition).toBe('v20');
    http.expectNone('/api/v1/rulesets/v20');
  });
});
