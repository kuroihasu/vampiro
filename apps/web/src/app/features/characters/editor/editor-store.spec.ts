import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  type Character,
  DARK_AGES_RULESET,
  emptySheet,
  V20_RULESET,
  V5_RULESET,
} from '@vampiro/shared';
import { errorInterceptor } from '../../../core/http/error-interceptor';
import { EditorStore } from './editor-store';

const character = (patch: Partial<Character> = {}): Character => ({
  id: 'c1',
  ownerId: 'u1',
  edition: 'v20',
  rulesetVersion: V20_RULESET.version,
  name: 'Lucía',
  concept: '',
  status: 'draft',
  sheet: emptySheet(),
  createdAt: '2026-11-04T00:00:00.000Z',
  updatedAt: '2026-11-04T00:00:00.000Z',
  ...patch,
});

describe('EditorStore', () => {
  let store: EditorStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EditorStore,
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(EditorStore);
    http = TestBed.inject(HttpTestingController);
    store.init(character(), V20_RULESET);
  });

  afterEach(() => http.verify());

  describe('puntos de creación', () => {
    it('el valor mostrado incluye la base del rasgo', () => {
      expect(store.total('fuerza')).toBe(1);
      store.setTotal('fuerza', 3);
      expect(store.sheet().traits['fuerza']).toBe(2);
      expect(store.total('fuerza')).toBe(3);
    });

    it('explica por qué no se puede poner un valor y no lo aplica', () => {
      expect(store.blockedReason('pelea', 4)).toContain('no puede superar 3');
      store.setTotal('pelea', 4);
      expect(store.total('pelea')).toBe(0);
    });

    it('permite valores válidos', () => {
      expect(store.blockedReason('pelea', 3)).toBeUndefined();
    });

    it('bloquea gastar más de lo que da la prioridad', () => {
      store.setPriority('attribute', 'physical', 2); // terciaria: 3 puntos
      store.setTotal('fuerza', 4);
      expect(store.blockedReason('destreza', 2)).toContain('4 de 3 puntos en Físicos');
    });

    it('no se puede bajar de la base', () => {
      store.setTotal('fuerza', 0);
      expect(store.total('fuerza')).toBe(1);
    });
  });

  describe('prioridades', () => {
    it('al elegir una prioridad ocupada, intercambia los grupos', () => {
      store.setPriority('attribute', 'physical', 0);
      store.setPriority('attribute', 'social', 1);
      store.setPriority('attribute', 'social', 0);
      expect(store.sheet().priorities.attribute).toEqual({ social: 0, physical: 1 });
    });

    it('el contador del grupo refleja la prioridad', () => {
      store.setPriority('attribute', 'physical', 0);
      store.setTotal('fuerza', 3);
      expect(store.budget('attribute.physical')).toEqual({
        path: 'attribute.physical',
        available: 7,
        spent: 2,
      });
    });
  });

  describe('clan', () => {
    it('al cambiar de clan quita las disciplinas que ya no son de clan', () => {
      store.setClan('brujah');
      store.setTotal('celeridad', 1);
      store.setClan('ventrue');
      expect(store.sheet().traits['celeridad']).toBeUndefined();
      expect(store.sheet().clan).toBe('ventrue');
    });
  });

  describe('puntos gratuitos', () => {
    it('compra y devuelve puntos, y cuenta el coste', () => {
      store.buyFreebie('voluntad', 1);
      store.buyFreebie('voluntad', 1);
      expect(store.freebieDots('voluntad')).toBe(2);
      expect(store.budget('freebies')?.spent).toBe(2);
      store.buyFreebie('voluntad', -1);
      expect(store.freebieDots('voluntad')).toBe(1);
    });

    it('impide pasarse del total de gratuitos', () => {
      store.setClan('brujah');
      store.buyFreebie('celeridad', 1);
      store.buyFreebie('celeridad', 1); // 14 de 15
      expect(store.freebieReason('celeridad', 1)).toContain('21 de 15');
      store.buyFreebie('celeridad', 1);
      expect(store.freebieDots('celeridad')).toBe(2);
    });

    it('Humanidad y Voluntad derivadas se actualizan', () => {
      store.setTotal('coraje', 3);
      store.buyFreebie('voluntad', 1);
      expect(store.derived()?.willpower).toBe(4);
    });
  });

  describe('méritos y defectos', () => {
    it('un mérito cuesta gratuitos y un defecto los devuelve', () => {
      store.toggleMeritFlaw('sentidos-agudos');
      expect(store.budget('freebies')).toMatchObject({ available: 15, spent: 1 });
      store.toggleMeritFlaw('fobia');
      expect(store.budget('freebies')?.available).toBe(17);
      expect(store.budget('flaws')).toMatchObject({ available: 7, spent: 2 });
      expect(store.hasMeritFlaw('fobia')).toBe(true);
    });

    it('quitarlo devuelve los puntos', () => {
      store.toggleMeritFlaw('sentidos-agudos');
      store.toggleMeritFlaw('sentidos-agudos');
      expect(store.hasMeritFlaw('sentidos-agudos')).toBe(false);
      expect(store.budget('freebies')?.spent).toBe(0);
    });

    it('explica por qué no se puede tomar y no lo aplica', () => {
      store.setClan('nosferatu');
      expect(store.meritFlawReason('atractivo')).toContain('Nosferatu');
      store.toggleMeritFlaw('atractivo');
      expect(store.hasMeritFlaw('atractivo')).toBe(false);
    });

    it('no deja pasar de 7 puntos de defectos', () => {
      store.toggleMeritFlaw('cazado'); // 4
      store.toggleMeritFlaw('enemigo'); // 3 → 7
      expect(store.meritFlawReason('pesadillas')).toContain('máximo es 7');
    });
  });

  describe('guardar', () => {
    it('envía la ficha con la versión y guarda la nueva', async () => {
      store.setTotal('fuerza', 2);
      const saved = store.save();
      const req = http.expectOne('/api/v1/characters/c1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toMatchObject({
        updatedAt: '2026-11-04T00:00:00.000Z',
        sheet: { traits: { fuerza: 1 } },
      });
      req.flush(character({ updatedAt: '2026-11-04T01:00:00.000Z', sheet: store.sheet() }));
      await saved;
      expect(store.dirty()).toBe(false);
      expect(store.character()?.updatedAt).toBe('2026-11-04T01:00:00.000Z');
    });

    it('un 422 del servidor queda junto al rasgo correspondiente', async () => {
      const saved = store.save();
      http.expectOne('/api/v1/characters/c1').flush(
        {
          code: 'RULE_VIOLATION',
          message: 'La ficha no cumple las reglas de la edición.',
          violations: [
            {
              code: 'MAX_CREACION_SUPERADO',
              severity: 'error',
              path: 'pelea',
              message: 'Máximo 3.',
            },
          ],
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      await saved;
      expect(store.violationsFor('pelea').map((v) => v.message)).toContain('Máximo 3.');
      expect(store.saveError()).toBe('La ficha no cumple las reglas de la edición.');
    });

    it('un 409 avisa de que la ficha cambió en otro sitio', async () => {
      const saved = store.save();
      http
        .expectOne('/api/v1/characters/c1')
        .flush(
          { code: 'CONFLICTO_VERSION', message: 'La ficha se guardó desde otro sitio.' },
          { status: 409, statusText: 'Conflict' },
        );
      await saved;
      expect(store.conflict()).toBe(true);
      expect(store.saveError()).toContain('otro sitio');
    });
  });

  describe('V5', () => {
    beforeEach(() => store.init(character({ edition: 'v5' }), V5_RULESET));

    it('los atributos empiezan en 0 y siguen el patrón 4/3/3/3/2/2/2/2/1', () => {
      expect(store.total('fuerza')).toBe(0);
      store.setTotal('fuerza', 4);
      expect(store.blockedReason('destreza', 4)).toContain('4');
      expect(store.blockedReason('destreza', 3)).toBeUndefined();
      expect(store.budget('attributes')).toMatchObject({ available: 22, spent: 4 });
    });

    it('elegir la distribución de habilidades cambia lo permitido', () => {
      store.setPatternChoice('skills', 'especialista');
      expect(store.blockedReason('pelea', 4)).toBeUndefined();
      store.setPatternChoice('skills', 'equilibrada');
      expect(store.blockedReason('pelea', 4)).toContain('4');
    });

    it('añade y quita especialidades; exige puntos en la habilidad', () => {
      expect(store.specialtyReason('pelea', 'Placajes')).toContain('Pelea');
      store.setPatternChoice('skills', 'equilibrada');
      store.setTotal('pelea', 3);
      expect(store.specialtyReason('pelea', 'Placajes')).toBeUndefined();
      store.addSpecialty('pelea', 'Placajes');
      expect(store.sheet().specialties).toEqual([{ skill: 'pelea', name: 'Placajes' }]);
      store.removeSpecialty(0);
      expect(store.sheet().specialties).toEqual([]);
    });

    it('una especialidad necesita nombre', () => {
      store.setPatternChoice('skills', 'equilibrada');
      store.setTotal('pelea', 3);
      expect(store.specialtyReason('pelea', '  ')).toContain('nombre');
    });
  });

  describe('Edad Oscura', () => {
    beforeEach(() => store.init(character({ edition: 'dark-ages' }), DARK_AGES_RULESET));

    it('las virtudes usables dependen del Camino', () => {
      expect(store.usableVirtues()).toEqual([]);
      store.setRoad('bestia');
      expect(store.usableVirtues()).toEqual(['conviccion', 'instinto', 'coraje']);
      expect(store.derived()?.moralityName).toBe('Camino de la Bestia');
    });

    it('al cambiar de Camino se quitan los puntos de virtudes que ya no se usan', () => {
      store.setRoad('humanidad');
      store.setTotal('conciencia', 3);
      store.setTotal('coraje', 2);
      store.setRoad('reyes');
      expect(store.sheet().traits['conciencia']).toBeUndefined();
      expect(store.sheet().traits['coraje']).toBe(1);
      expect(store.sheet().road).toBe('reyes');
    });
  });
});
