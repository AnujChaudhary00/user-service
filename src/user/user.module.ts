import { Module } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { DynamoDbModule } from '../infra/database/DynamoDb.module';
import { UserRepository } from './repository/user.repository';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [DynamoDbModule],
  controllers: [UserController],
  providers: [UserService, UserRepository, JwtGuard],
})
export class UserModule {}
