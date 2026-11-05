export interface DicePoolRequest {
  /** Claves de los rasgos que se suman (normalmente atributo + habilidad). */
  traits: string[];
  /** Modificador plano (penalizador por heridas, bonificaciones, etc.). */
  modifier?: number;
  difficulty?: number;
  hunger?: number;
}

export interface DicePool {
  dice: number;
  difficulty?: number;
  hungerDice?: number;
  /** Desglose para mostrarlo al jugador. */
  breakdown: { source: string; dice: number }[];
}
