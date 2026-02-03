import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  // ValidationPipe returns an array of strings, and business errors return a string.
  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['email must be an email', 'password should not be empty'],
  })
  message!: string | string[];

  @ApiProperty({ example: '/api/auth/register' })
  path!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;

  @ApiPropertyOptional({ example: '4115178d-2cdf-49bb-b418-80139f19be81' })
  requestId?: string;
}
