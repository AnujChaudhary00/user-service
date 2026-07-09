import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { Injectable } from '@nestjs/common';
import { DynamoDbService } from '../../infra/database/DynamoDB.service';
import { IUserRepository, User } from '../models/user.interface';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'user';
const EMAIL_INDEX = 'email-index';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly dynamoDbService: DynamoDbService) {}

  async create(user: User): Promise<void> {
    await this.dynamoDbService.client.send(
      new PutCommand({ TableName: TABLE_NAME, Item: user }),
    );
  }

  // O(1) — primary key lookup
  async findById(id: string): Promise<User | null> {
    const response = await this.dynamoDbService.client.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { id } }),
    );
    return (response.Item as User) ?? null;
  }

  // O(1) — GSI "email-index" exact match; used for login and duplicate checks
  async findByEmail(email: string): Promise<User | null> {
    const response = await this.dynamoDbService.client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: EMAIL_INDEX,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
        Limit: 1,
      }),
    );
    return (response.Items?.[0] as User) ?? null;
  }

  // Full table scan — paginated to avoid unbounded reads
  async findAll(): Promise<User[]> {
    const items: User[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const response = await this.dynamoDbService.client.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          Limit: 100,
          ExclusiveStartKey: lastKey,
        }),
      );
      items.push(...((response.Items as User[]) ?? []));
      lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return items;
  }

  // Partial email search — DynamoDB has no index for substring match;
  // Scan with contains() is the only native option. For production scale
  // consider AWS OpenSearch.
  async searchByEmail(query: string): Promise<User[]> {
    const response = await this.dynamoDbService.client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'contains(email, :query)',
        ExpressionAttributeValues: { ':query': query },
        Limit: 50,
      }),
    );
    return (response.Items as User[]) ?? [];
  }

  async update(
    id: string,
    updates: Partial<Omit<User, 'id'>>,
  ): Promise<User | null> {
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (!entries.length) return this.findById(id);

    const expressionParts: string[] = [];
    const exprNames: Record<string, string> = {};
    const exprValues: Record<string, unknown> = {};

    entries.forEach(([key, value], i) => {
      expressionParts.push(`#f${i} = :v${i}`);
      exprNames[`#f${i}`] = key;
      exprValues[`:v${i}`] = value;
    });

    const response = await this.dynamoDbService.client.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
      }),
    );
    return (response.Attributes as User) ?? null;
  }

  async remove(id: string): Promise<void> {
    await this.dynamoDbService.client.send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }),
    );
  }
}
