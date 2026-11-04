import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { RoomMasterGuard, RoomMemberGuard } from './room-access.guard.js';
import { RoomCharactersService } from './room-characters.service.js';
import { RoomComplianceModule } from './room-compliance.module.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [RoomComplianceModule, RealtimeModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomCharactersService, RoomMemberGuard, RoomMasterGuard],
  exports: [RoomsService, RoomCharactersService, RoomMemberGuard, RoomMasterGuard],
})
export class RoomsModule {}
