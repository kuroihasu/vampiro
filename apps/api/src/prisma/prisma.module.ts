import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/** Global: casi todos los módulos de dominio acceden a la base. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
