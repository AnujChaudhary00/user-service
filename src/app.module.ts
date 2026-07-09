import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DynamoDbModule } from './infra/database/DynamoDb.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DynamoDbModule, AuthModule, UserModule],
  controllers: [AppController],
})
export class AppModule {}
