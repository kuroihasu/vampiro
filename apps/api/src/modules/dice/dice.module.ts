import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { DiceController } from './dice.controller.js';
import { DiceService } from './dice.service.js';

@Module({
  imports: [RoomsModule, RealtimeModule],
  controllers: [DiceController],
  providers: [DiceService],
})
export class DiceModule {}
