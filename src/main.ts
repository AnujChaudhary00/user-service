import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { loadSecrets } from './config/load-secrets';

function validateEnv() {
  const required = ['JWT_SECRET', 'DYNAMODB_TABLE_NAME', 'AWS_REGION'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}

async function bootstrap() {
  await loadSecrets();
  validateEnv();
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('User Service')
      .setDescription('API for user registration, login, and management')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const document = SwaggerModule.createDocument(app as any, config);
    SwaggerModule.setup('api/docs', app as any, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch(err => {
  console.error('Failed to start application', err);
  process.exit(1);
});
