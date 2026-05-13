/* eslint-disable no-console */
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

const region = process.env.AWS_REGION ?? "eu-west-2";
const endpoint = process.env.DYNAMODB_ENDPOINT;
const tableName = process.env.DYNAMODB_TABLE ?? "office-tracker";
const pkAttr = "office-tracker";

const client = new DynamoDBClient({
  region,
  ...(endpoint
    ? {
        endpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
        },
      }
    : {}),
});

async function main() {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(
      `Table "${tableName}" already exists in ${region}${
        endpoint ? ` at ${endpoint}` : ""
      }.`,
    );
    return;
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (error.name !== "ResourceNotFoundException") {
      throw err;
    }
  }

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [{ AttributeName: pkAttr, AttributeType: "S" }],
      KeySchema: [{ AttributeName: pkAttr, KeyType: "HASH" }],
    }),
  );
  console.log(
    `Created table "${tableName}" in ${region}${
      endpoint ? ` at ${endpoint}` : ""
    } with partition key "${pkAttr}".`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
