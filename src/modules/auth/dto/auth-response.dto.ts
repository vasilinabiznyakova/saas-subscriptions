import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user.a@test.com' })
  email!: string;

  @ApiProperty({ example: 'UA' })
  region!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-01-31T19:53:58.100Z',
  })
  createdAt!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;
}
