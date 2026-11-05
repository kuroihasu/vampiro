import { Component, computed, input, linkedSignal, output } from '@angular/core';
import type { RoomConfig, Ruleset } from '@vampiro/shared';
import { TraitTooltip } from '../../shared/trait-tooltip';
import {
  clanAllowed,
  type DisciplineAudience,
  disciplineAllowed,
  setClanAllowed,
  setDisciplineAllowed,
} from './room-config-form';

/** Panel del master: qué se permite en la sala. Edita una copia y emite al guardar. */
@Component({
  selector: 'app-room-config-editor',
  imports: [TraitTooltip],
  templateUrl: './room-config-editor.html',
  styleUrl: './room-config-editor.scss',
})
export class RoomConfigEditor {
  readonly config = input.required<RoomConfig>();
  readonly ruleset = input.required<Ruleset>();
  readonly saving = input(false);
  readonly save = output<RoomConfig>();

  /** Copia editable; se reinicia cuando llega una config nueva del servidor. */
  protected readonly draft = linkedSignal(() => this.config());
  protected readonly changed = computed(
    () => JSON.stringify(this.draft()) !== JSON.stringify(this.config()),
  );

  protected readonly disciplines = computed(() =>
    this.ruleset().catalog.filter((t) => t.category === 'discipline'),
  );
  protected readonly clans = computed(() => this.ruleset().clans);
  private readonly clanKeys = computed(() => this.clans().map((c) => c.key));

  protected allowed(discipline: string, who: DisciplineAudience): boolean {
    return disciplineAllowed(this.draft(), discipline, who);
  }

  protected toggleDiscipline(discipline: string, who: DisciplineAudience, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.draft.update((c) => setDisciplineAllowed(c, discipline, who, checked));
  }

  protected clanOn(clan: string): boolean {
    return clanAllowed(this.draft(), clan);
  }

  protected toggleClan(clan: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.draft.update((c) => setClanAllowed(c, this.clanKeys(), clan, checked));
  }

  protected setMerits(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.draft.update((c) => ({ ...c, allowMeritsFlaws: checked }));
  }

  protected setNumber(
    field: 'extraFreebies' | 'minGeneration' | 'maxGeneration',
    event: Event,
  ): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    this.draft.update((c) => {
      const next = { ...c };
      if (raw === '') {
        if (field === 'extraFreebies') next.extraFreebies = 0;
        else delete next[field];
      } else {
        next[field] = Math.trunc(Number(raw));
      }
      return next;
    });
  }

  protected setVisibility(value: 'all' | 'master-only'): void {
    this.draft.update((c) => ({ ...c, diceVisibility: value }));
  }
}
