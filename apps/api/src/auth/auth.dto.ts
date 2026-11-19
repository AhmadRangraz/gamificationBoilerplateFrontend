import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBase64,
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EmailDto {
  @ApiProperty({ format: 'email', maxLength: 254 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'نشانی ایمیل معتبر نیست.' })
  @MaxLength(254, { message: 'نشانی ایمیل طولانی است.' })
  email!: string;
}

export class CredentialsDto extends EmailDto {
  @ApiProperty({
    format: 'password',
    minLength: 12,
    maxLength: 128,
    writeOnly: true,
  })
  @IsString({ message: 'گذرواژه باید متن باشد.' })
  @MinLength(12, { message: 'گذرواژه باید دست‌کم ۱۲ نویسه داشته باشد.' })
  @MaxLength(128, { message: 'گذرواژه بیش از حد طولانی است.' })
  password!: string;
}

export class ProfileDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'نام باید متن باشد.' })
  @MinLength(1, { message: 'نام را وارد کنید.' })
  @MaxLength(100, { message: 'نام بیش از حد طولانی است.' })
  name!: string;
}

export class RegisterDto extends IntersectionType(CredentialsDto, ProfileDto) {}

export class AccountResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['MEMBER', 'ADMIN'] })
  role!: 'MEMBER' | 'ADMIN';

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  suspendedAt!: Date | null;
}

export class AccountCodeDto {
  @ApiProperty({ minLength: 43, maxLength: 43, writeOnly: true })
  @Matches(/^[A-Za-z0-9_-]{43}$/, { message: 'کد معتبر نیست.' })
  code!: string;
}

export class ResetPasswordDto extends IntersectionType(
  AccountCodeDto,
  PickType(CredentialsDto, ['password'] as const),
) {}

export class AccountStatusDto {
  @ApiProperty()
  @IsBoolean({ message: 'وضعیت حساب معتبر نیست.' })
  suspended!: boolean;
}

export class AvatarDto {
  @ApiProperty({ type: 'string', format: 'byte', maxLength: 65536 })
  @IsString({ message: 'تصویر معتبر نیست.' })
  @MaxLength(65_536, { message: 'حجم تصویر بیش از حد مجاز است.' })
  @IsBase64({}, { message: 'قالب تصویر معتبر نیست.' })
  image!: string;
}
