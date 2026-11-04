import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { DiceRollRecord, RollsPage } from '@vampiro/shared';
import { firstValueFrom } from 'rxjs';

const PAGE = 20;

/**
 * Historial de tiradas de una sala: primera página por REST, tiradas nuevas por socket,
 * "cargar más" hacia atrás y resincronización tras reconectar (sin duplicados).
 */
@Service({ autoProvided: false })
export class RollHistoryStore {
  private readonly http = inject(HttpClient);
  private roomId?: string;
  private readonly byId = signal<ReadonlyMap<string, DiceRollRecord>>(new Map());
  private readonly cursor = signal<string | undefined>(undefined);

  readonly loading = signal(false);
  readonly items = computed(() =>
    [...this.byId().values()].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    ),
  );
  readonly hasMore = computed(() => this.cursor() !== undefined);

  async load(roomId: string): Promise<void> {
    this.roomId = roomId;
    this.byId.set(new Map());
    const page = await this.fetch();
    this.merge(page.items);
    this.cursor.set(page.nextCursor);
  }

  async loadMore(): Promise<void> {
    const cursor = this.cursor();
    if (!cursor) return;
    const page = await this.fetch(cursor);
    this.merge(page.items);
    this.cursor.set(page.nextCursor);
  }

  /** Tras una reconexión: trae la primera página y la mezcla con lo que ya había. */
  async resync(): Promise<void> {
    if (!this.roomId) return;
    this.merge((await this.fetch()).items);
  }

  add(roll: DiceRollRecord): void {
    this.merge([roll]);
  }

  private merge(rolls: DiceRollRecord[]): void {
    if (rolls.length === 0) return;
    this.byId.update((current) => {
      const next = new Map(current);
      for (const r of rolls) next.set(r.id, r);
      return next;
    });
  }

  private async fetch(cursor?: string): Promise<RollsPage> {
    this.loading.set(true);
    try {
      const params: Record<string, string> = { limit: String(PAGE) };
      if (cursor) params['cursor'] = cursor;
      return await firstValueFrom(
        this.http.get<RollsPage>(`/api/v1/rooms/${this.roomId}/rolls`, { params }),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
