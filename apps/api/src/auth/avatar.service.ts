import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../prisma.service.js';
import { lockAccount } from './account-transaction.js';

@Injectable()
export class AvatarService {
  constructor(private readonly db: PrismaService) {}

  async save(accountId: string, encoded: string) {
    let image: Buffer;
    try {
      const source = sharp(Buffer.from(encoded, 'base64'), {
        limitInputPixels: 4_194_304,
        failOn: 'warning',
      });
      const metadata = await source.metadata();
      if (
        !['png', 'jpeg', 'webp'].includes(metadata.format) ||
        (metadata.pages ?? 1) !== 1
      ) {
        throw new Error('Unsupported image');
      }
      image = await source
        .rotate()
        .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
    } catch {
      throw new BadRequestException('فایل تصویر قابل خواندن نیست.');
    }
    await this.db.$transaction(async (tx) => {
      const account = await lockAccount(tx, accountId);
      if (!account || account.suspendedAt)
        throw new UnauthorizedException('لطفاً وارد حساب خود شوید.');
      await tx.avatar.upsert({
        where: { accountId },
        create: { accountId, image: new Uint8Array(image) },
        update: { image: new Uint8Array(image) },
      });
    });
  }

  async read(accountId: string) {
    const avatar = await this.db.avatar.findUnique({ where: { accountId } });
    if (!avatar) throw new NotFoundException('تصویر حساب پیدا نشد.');
    return avatar.image;
  }

  async remove(accountId: string) {
    await this.db.avatar.deleteMany({ where: { accountId } });
  }
}
