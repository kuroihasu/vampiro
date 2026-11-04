import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { DicePool, DiceRollRecord, RollsPage } from '@vampiro/shared';
import { Membership, RoomMemberGuard, type RoomMembership } from '../rooms/room-access.guard.js';
import { DiceService } from './dice.service.js';
import { DicePoolDto, ListRollsQuery, RollDto } from './dto/dice.dto.js';
import { UserThrottlerGuard } from './user-throttler.guard.js';

/** Dados de una sala. Todas las rutas exigen ser miembro. */
@Controller('rooms/:id')
@UseGuards(RoomMemberGuard)
export class DiceController {
  constructor(private readonly dice: DiceService) {}

  /** Vista previa de la reserva (no tira nada). */
  @Post('dice-pool')
  @HttpCode(HttpStatus.OK)
  pool(@Membership() membership: RoomMembership, @Body() dto: DicePoolDto): Promise<DicePool> {
    return this.dice.pool(membership, dto);
  }

  /** Tira en el servidor y lo difunde por el WebSocket. 10 tiradas cada 10 s por persona. */
  @Post('rolls')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 10_000 } })
  roll(@Membership() membership: RoomMembership, @Body() dto: RollDto): Promise<DiceRollRecord> {
    return this.dice.roll(membership, dto);
  }

  @Get('rolls')
  list(
    @Membership() membership: RoomMembership,
    @Query() query: ListRollsQuery,
  ): Promise<RollsPage> {
    return this.dice.list(membership, query.cursor, query.limit ? Number(query.limit) : undefined);
  }
}
