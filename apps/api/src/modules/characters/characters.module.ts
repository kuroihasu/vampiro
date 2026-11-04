import { Module } from '@nestjs/common';
import { RoomComplianceModule } from '../rooms/room-compliance.module.js';
import { CharactersController } from './characters.controller.js';
import { CharactersService } from './characters.service.js';

@Module({
  imports: [RoomComplianceModule],
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
