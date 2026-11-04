import { Injectable } from '@nestjs/common';
import type { DiceRollRecord, RoomClientEvents, RoomServerEvents } from '@vampiro/shared';
import type { Namespace } from 'socket.io';

export const roomChannel = (roomId: string) => `room:${roomId}`;
export const mastersChannel = (roomId: string) => `room:${roomId}:masters`;
export const userChannel = (userId: string) => `user:${userId}`;

type RoomsNamespace = Namespace<RoomClientEvents, RoomServerEvents>;

/**
 * Envía eventos a los sockets de una sala. Los servicios REST lo llaman después de
 * escribir en la base: la API es la fuente de verdad y el socket solo avisa.
 */
@Injectable()
export class RoomEventsService {
  private namespace?: RoomsNamespace;

  /** Lo llama el gateway al arrancar. */
  attach(namespace: RoomsNamespace): void {
    this.namespace = namespace;
  }

  emit<E extends keyof RoomServerEvents>(
    roomId: string,
    event: E,
    ...payload: Parameters<RoomServerEvents[E]>
  ): void {
    this.namespace?.to(roomChannel(roomId)).emit(event, ...payload);
  }

  /** Respeta diceVisibility: con 'master-only' solo la reciben el master y quien tiró. */
  roll(roll: DiceRollRecord): void {
    if (!this.namespace) return;
    const target =
      roll.visibility === 'all'
        ? this.namespace.to(roomChannel(roll.roomId))
        : this.namespace.to(mastersChannel(roll.roomId)).to(userChannel(roll.userId));
    target.emit('roll.created', roll);
  }

  /** Saca de la sala los sockets de un usuario (expulsado o que se ha ido). */
  removeUser(roomId: string, userId: string): void {
    this.namespace
      ?.in(userChannel(userId))
      .socketsLeave([roomChannel(roomId), mastersChannel(roomId)]);
  }
}
