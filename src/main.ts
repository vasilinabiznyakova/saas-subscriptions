import { Logger, LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logLevels: LogLevel[] =
    process.env.NODE_ENV === 'production'
      ? ['log', 'warn', 'error']
      : ['log', 'debug', 'warn', 'error', 'verbose'];

  const app = await NestFactory.create(AppModule, { logger: logLevels });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on http://localhost:${port}`);
}

void bootstrap();
