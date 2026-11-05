import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { RoomRole } from '@vampiro/shared';
import type { Request } from 'express';
import { ApiException } from '../../common/api-exception.js';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { isUuid } from '../../common/validators.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface RoomMembership {
  roomId: string;
  userId: string;
  role: RoomRole;
}

type RoomRequest = Request & { user: AuthUser; roomMembership?: RoomMembership };

/**
 * Exige ser miembro de la sala del parámetro `:id`. A quien no lo es se le responde 404,
 * igual que si la sala no existiera.
 */
@Injectable()
export class RoomMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RoomRequest>();
    const roomId = request.params['id'];
    if (typeof roomId !== 'string' || !isUuid(roomId)) throw roomNotFound();
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: request.user.id } },
    });
    if (!member) throw roomNotFound();
    request.roomMembership = { roomId, userId: member.userId, role: member.role };
    return this.check(member.role);
  }

  protected check(_role: RoomRole): boolean {
    return true;
  }
}

/** Como RoomMemberGuard, pero además exige ser el master (403 si es jugador). */
@Injectable()
export class RoomMasterGuard extends RoomMemberGuard {
  protected override check(role: RoomRole): boolean {
    if (role !== 'master') throw onlyMaster();
    return true;
  }
}

/** Membresía que dejó el guard en la petición. */
export const Membership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RoomMembership => {
    const membership = ctx.switchToHttp().getRequest<RoomRequest>().roomMembership;
    if (!membership) throw new Error('Membership sin RoomMemberGuard');
    return membership;
  },
);

export const roomNotFound = () => new ApiException(404, 'NO_ENCONTRADO', 'No existe esa sala.');
export const onlyMaster = () =>
  new ApiException(403, 'PROHIBIDO', 'Solo el master de la sala puede hacer esto.');
