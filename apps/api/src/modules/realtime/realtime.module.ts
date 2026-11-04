import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RoomEventsService } from './room-events.service.js';
import { RoomsGateway } from './rooms.gateway.js';

/** Tiempo real de las salas: el gateway y el servicio que usan los módulos REST para avisar. */
@Module({
  imports: [AuthModule],
  providers: [RoomsGateway, RoomEventsService],
  exports: [RoomEventsService],
})
export class RealtimeModule {}
