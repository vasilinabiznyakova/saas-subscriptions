import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

function trimLower(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function trimUpper(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class RegisterDto {
  @ApiProperty({ example: 'user.a@test.com' })
  @Transform(({ value }: { value: unknown }) => trimLower(value))
  @IsString()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @Transform(({ value }: { value: unknown }) => trim(value))
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'UA', description: '2-letter region code' })
  @Transform(({ value }: { value: unknown }) => trimUpper(value))
  @IsString()
  @Length(2, 2)
  region!: string;
}
