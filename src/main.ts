import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on http://localhost:${port}`);
}

void bootstrap();
