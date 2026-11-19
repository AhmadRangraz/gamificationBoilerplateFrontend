import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

const pageSize = 25;

@Injectable()
export class WorkspacesService {
  constructor(private readonly db: PrismaService) {}

  async list(page: number) {
    const rows = await this.db.workspace.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return {
      items: rows.slice(0, pageSize),
      hasNext: page < 500 && rows.length > pageSize,
    };
  }

  async save(data: { name: string; slug: string }, id?: string) {
    try {
      return await (id
        ? this.db.workspace.update({ where: { id }, data })
        : this.db.workspace.create({ data }));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('این شناسه پیش‌تر استفاده شده است.');
      }
      throw missingWorkspace(error);
    }
  }

  async remove(id: string) {
    try {
      await this.db.workspace.delete({ where: { id } });
    } catch (error) {
      throw missingWorkspace(error);
    }
  }
}

function missingWorkspace(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
    ? new NotFoundException('فضای کاری پیدا نشد.')
    : error;
}
