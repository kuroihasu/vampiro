import { DEFAULT_ROOM_CONFIG } from '@vampiro/shared';
import { disciplineAllowed, setDisciplineAllowed, setClanAllowed } from './room-config-form';

describe('room-config-form', () => {
  describe('disciplinas', () => {
    it('sin regla, una disciplina está permitida para todos', () => {
      expect(disciplineAllowed(DEFAULT_ROOM_CONFIG, 'temporis', 'players')).toBe(true);
      expect(disciplineAllowed(DEFAULT_ROOM_CONFIG, 'temporis', 'npc')).toBe(true);
    });

    it('vetar a jugadores crea la regla y deja a los NPC como estaban', () => {
      const config = setDisciplineAllowed(DEFAULT_ROOM_CONFIG, 'temporis', 'players', false);
      expect(config.disciplineRules).toEqual([
        { discipline: 'temporis', players: false, npc: true },
      ]);
    });

    it('si vuelve a estar permitida para todos, la regla desaparece', () => {
      const vetada = setDisciplineAllowed(DEFAULT_ROOM_CONFIG, 'temporis', 'players', false);
      const otraVez = setDisciplineAllowed(vetada, 'temporis', 'players', true);
      expect(otraVez.disciplineRules).toEqual([]);
    });

    it('no toca las reglas de otras disciplinas', () => {
      const a = setDisciplineAllowed(DEFAULT_ROOM_CONFIG, 'temporis', 'players', false);
      const b = setDisciplineAllowed(a, 'taumaturgia', 'npc', false);
      expect(b.disciplineRules).toEqual([
        { discipline: 'temporis', players: false, npc: true },
        { discipline: 'taumaturgia', players: true, npc: false },
      ]);
    });
  });

  describe('clanes', () => {
    const all = ['brujah', 'gangrel', 'ventrue'];

    it('quitar un clan de "todos" deja la lista con el resto', () => {
      const config = setClanAllowed(DEFAULT_ROOM_CONFIG, all, 'gangrel', false);
      expect(config.allowedClans).toEqual(['brujah', 'ventrue']);
    });

    it('si se marcan todos otra vez, vuelve a "all"', () => {
      const sin = setClanAllowed(DEFAULT_ROOM_CONFIG, all, 'gangrel', false);
      const con = setClanAllowed(sin, all, 'gangrel', true);
      expect(con.allowedClans).toBe('all');
    });
  });
});
