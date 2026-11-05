import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  type InvitePreview,
  parseRoomConfig,
  type RoomCharacterInfo,
  type RoomDetail,
  type RoomSummary,
} from '@vampiro/shared';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { Public } from '../../common/auth/public.decorator.js';
import {
  CreateRoomDto,
  InviteCodeDto,
  JoinRoomDto,
  LinkCharacterDto,
  UpdateRoomCharacterDto,
} from './dto/room.dto.js';
import {
  Membership,
  RoomMasterGuard,
  RoomMemberGuard,
  type RoomMembership,
} from './room-access.guard.js';
import { RoomCharactersService } from './room-characters.service.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly roomCharacters: RoomCharactersService,
  ) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoomDto): Promise<RoomDetail> {
    return this.rooms.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<RoomSummary[]> {
    return this.rooms.list(user.id);
  }

  /** Vista previa de una invitación: pública, para enseñar a qué sala se entra antes de iniciar sesión. */
  @Public()
  @Get('invite/:code')
  preview(@Param('code') code: string): Promise<InvitePreview> {
    return this.rooms.previewInvite(code);
  }

  @Post('join')
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinRoomDto): Promise<RoomDetail> {
    return this.rooms.join(user.id, dto.code);
  }

  @Get(':id')
  @UseGuards(RoomMemberGuard)
  detail(@Membership() membership: RoomMembership): Promise<RoomDetail> {
    return this.rooms.detail(membership);
  }

  /** El cuerpo es el RoomConfig completo. */
  @Patch(':id/config')
  @UseGuards(RoomMasterGuard)
  updateConfig(
    @Membership() membership: RoomMembership,
    @Body() body: unknown,
  ): Promise<RoomDetail> {
    const parsed = parseRoomConfig(body);
    if (!parsed.ok) throw new BadRequestException({ message: parsed.errors });
    return this.rooms.updateConfig(membership, parsed.config);
  }

  @Post(':id/invite-code')
  @UseGuards(RoomMasterGuard)
  regenerateInvite(
    @Membership() membership: RoomMembership,
    @Body() dto: InviteCodeDto,
  ): Promise<{ code: string; expiresAt?: string }> {
    return this.rooms.regenerateInvite(membership.roomId, dto.expiresInHours);
  }

  @Delete(':id/members/:userId')
  @UseGuards(RoomMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Membership() membership: RoomMembership,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.rooms.removeMember(membership, userId);
  }

  @Post(':id/characters')
  @UseGuards(RoomMemberGuard)
  link(
    @Membership() membership: RoomMembership,
    @Body() dto: LinkCharacterDto,
  ): Promise<RoomCharacterInfo> {
    return this.roomCharacters.link(membership, dto);
  }

  @Patch(':id/characters/:linkId')
  @UseGuards(RoomMasterGuard)
  updateCharacter(
    @Membership() membership: RoomMembership,
    @Param('linkId') linkId: string,
    @Body() dto: UpdateRoomCharacterDto,
  ): Promise<RoomCharacterInfo> {
    return this.roomCharacters.update(membership, linkId, dto);
  }

  @Delete(':id/characters/:linkId')
  @UseGuards(RoomMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  unlink(@Membership() membership: RoomMembership, @Param('linkId') linkId: string): Promise<void> {
    return this.roomCharacters.unlink(membership, linkId);
  }
}
