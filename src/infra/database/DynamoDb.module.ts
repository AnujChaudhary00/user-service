import { Module } from '@nestjs/common';
import { DynamoDbService } from './DynamoDB.service';

@Module({
    providers: [DynamoDbService],
    exports: [DynamoDbService]
})
export class DynamoDbModule { }
