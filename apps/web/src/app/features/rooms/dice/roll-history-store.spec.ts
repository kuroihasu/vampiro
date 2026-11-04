import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { DiceRollRecord, RollsPage } from '@vampiro/shared';
import { RollHistoryStore } from './roll-history-store';

const roll = (id: string, createdAt: string): DiceRollRecord => ({
  id,
  roomId: 'r1',
  userId: 'u1',
  userName: 'Nadia',
  label: 'Tirada',
  pool: { dice: 1, breakdown: [] },
  result: { dice: [7], successes: 1, outcome: 'success', difficulty: 6 },
  visibility: 'all',
  createdAt,
});

describe('RollHistoryStore', () => {
  let store: RollHistoryStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RollHistoryStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(RollHistoryStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function load(page: RollsPage) {
    const done = store.load('r1');
    http.expectOne('/api/v1/rooms/r1/rolls?limit=20').flush(page);
    await done;
  }

  it('carga la primera página', async () => {
    await load({
      items: [roll('b', '2026-11-04T10:01:00Z'), roll('a', '2026-11-04T10:00:00Z')],
      nextCursor: 'c1',
    });
    expect(store.items().map((r) => r.id)).toEqual(['b', 'a']);
    expect(store.hasMore()).toBe(true);
  });

  it('una tirada nueva en vivo va arriba y no se duplica', async () => {
    await load({ items: [roll('a', '2026-11-04T10:00:00Z')] });
    store.add(roll('b', '2026-11-04T10:01:00Z'));
    store.add(roll('b', '2026-11-04T10:01:00Z'));
    expect(store.items().map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('"cargar más" añade las antiguas al final', async () => {
    await load({ items: [roll('b', '2026-11-04T10:01:00Z')], nextCursor: 'c1' });
    const more = store.loadMore();
    http
      .expectOne('/api/v1/rooms/r1/rolls?limit=20&cursor=c1')
      .flush({ items: [roll('a', '2026-11-04T10:00:00Z')] });
    await more;
    expect(store.items().map((r) => r.id)).toEqual(['b', 'a']);
    expect(store.hasMore()).toBe(false);
  });

  it('al resincronizar tras una reconexión recupera las tiradas perdidas sin perder las cargadas', async () => {
    await load({
      items: [roll('b', '2026-11-04T10:01:00Z'), roll('a', '2026-11-04T10:00:00Z')],
      nextCursor: 'c1',
    });
    const sync = store.resync();
    http.expectOne('/api/v1/rooms/r1/rolls?limit=20').flush({
      items: [
        roll('d', '2026-11-04T10:03:00Z'),
        roll('c', '2026-11-04T10:02:00Z'),
        roll('b', '2026-11-04T10:01:00Z'),
      ],
    });
    await sync;
    expect(store.items().map((r) => r.id)).toEqual(['d', 'c', 'b', 'a']);
  });
});
