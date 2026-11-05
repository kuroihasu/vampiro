import { Module } from '@nestjs/common';
import { RoomComplianceService } from './room-compliance.service.js';

/** Módulo pequeño para que characters pueda recalcular la validez sin depender de rooms. */
@Module({
  providers: [RoomComplianceService],
  exports: [RoomComplianceService],
})
export class RoomComplianceModule {}
