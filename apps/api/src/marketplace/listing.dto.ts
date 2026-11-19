import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ListingCategory } from '../generated/prisma/client.js';

export class ListingInput {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ minLength: 1, maxLength: 1200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  description!: string;

  @ApiProperty({ enum: ListingCategory })
  @IsEnum(ListingCategory)
  category!: ListingCategory;

  @ApiProperty({ type: 'integer', minimum: 0, maximum: 1_000_000_000 })
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price!: number;
}

export class ListingResponse extends ListingInput {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  sellerName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class PageQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  page = 1;
}

export class ListingQuery extends PageQuery {
  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ListingCategory })
  @IsOptional()
  @IsEnum(ListingCategory)
  category?: ListingCategory;
}

export class ListingPage {
  @ApiProperty({ type: [ListingResponse] })
  items!: ListingResponse[];

  @ApiProperty()
  hasNext!: boolean;
}

export class FavoriteState {
  @ApiProperty()
  saved!: boolean;
}
