import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'user';

@Injectable()
export class DynamoDbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DynamoDbService.name);
  private dbClient!: DynamoDBClient;
  private dbDocClient!: DynamoDBDocumentClient;

  async onModuleInit() {
    this.dbClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(process.env.DYNAMODB_ENDPOINT && {
        endpoint: process.env.DYNAMODB_ENDPOINT,
      }),
    });
    this.dbDocClient = DynamoDBDocumentClient.from(this.dbClient);
    await this.ensureTableExists();
  }

  private async ensureTableExists(): Promise<void> {
    try {
      await this.dbClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      this.logger.log(`Table "${TABLE_NAME}" is ready`);
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        this.logger.log(`Table "${TABLE_NAME}" not found — creating...`);
        await this.dbClient.send(
          new CreateTableCommand({
            TableName: TABLE_NAME,
            BillingMode: 'PAY_PER_REQUEST',
            AttributeDefinitions: [
              { AttributeName: 'id', AttributeType: 'S' },
              { AttributeName: 'email', AttributeType: 'S' },
            ],
            KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
            GlobalSecondaryIndexes: [
              {
                IndexName: 'email-index',
                KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
                Projection: { ProjectionType: 'ALL' },
              },
            ],
          }),
        );
        this.logger.log(`Table "${TABLE_NAME}" created with GSI "email-index"`);
      } else {
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    this.dbClient?.destroy();
  }

  get client(): DynamoDBDocumentClient {
    return this.dbDocClient;
  }
}
