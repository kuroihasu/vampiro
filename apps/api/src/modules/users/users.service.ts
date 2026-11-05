import { Injectable } from '@nestjs/common';
import type { PublicUser } from '@vampiro/shared';
import { ApiException } from '../../common/api-exception.js';
import type { User } from '../../generated/prisma/client.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: { email: string; passwordHash: string; displayName: string }): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      // Carrera entre dos registros con el mismo email.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw emailInUse();
      }
      throw error;
    }
  }

  async getProfile(id: string): Promise<PublicUser> {
    const user = await this.findById(id);
    if (!user) throw new ApiException(401, 'NO_AUTENTICADO', 'La sesión ya no es válida.');
    return toPublicUser(user);
  }

  async updateProfile(id: string, data: { displayName?: string }): Promise<PublicUser> {
    await this.getProfile(id);
    return toPublicUser(await this.prisma.user.update({ where: { id }, data }));
  }
}

export const emailInUse = () =>
  new ApiException(409, 'EMAIL_EN_USO', 'Ya existe una cuenta con ese email.');
