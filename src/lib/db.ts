import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const TABLE_NAME = process.env.DYNAMODB_TABLE ?? "office-tracker";

export const PK_ATTR = "office-tracker";

const region = process.env.AWS_REGION ?? "eu-west-2";
const endpoint = process.env.DYNAMODB_ENDPOINT;

const baseClient = new DynamoDBClient({
  region,
  ...(endpoint
    ? {
        endpoint,
        credentials: {
          accessKeyId: "local",
          secretAccessKey: "local",
        },
      }
    : {}),
});

export const ddb = DynamoDBDocumentClient.from(baseClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const userKey = (email: string) => ({
  [PK_ATTR]: email.toLowerCase(),
});
