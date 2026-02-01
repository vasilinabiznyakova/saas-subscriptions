import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

function trimLower(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class LoginDto {
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
}
