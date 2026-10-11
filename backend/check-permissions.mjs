import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { ApiGatewayV2Client, GetApisCommand } from '@aws-sdk/client-apigatewayv2';
import { IAMClient, ListAttachedUserPoliciesCommand, GetUserCommand } from '@aws-sdk/client-iam';

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};
const region = process.env.AWS_DEFAULT_REGION || 'ap-south-1';

console.log('Testing IAM User Permissions for Dummy...');

const sts = new STSClient({ region, credentials });
const caller = await sts.send(new GetCallerIdentityCommand({}));
console.log('Caller ARN:', caller.Arn);

// Check IAM User info & boundaries
const iam = new IAMClient({ region, credentials });
try {
  const user = await iam.send(new GetUserCommand({ UserName: 'Dummy' }));
  console.log('Permissions Boundary:', user.User?.PermissionsBoundary?.PermissionsBoundaryArn || 'NONE');
} catch (e) {
  console.log('GetUser failed:', e.message);
}

// Check DynamoDB
const ddb = new DynamoDBClient({ region, credentials });
try {
  const tables = await ddb.send(new ListTablesCommand({}));
  console.log('DynamoDB Tables:', tables.TableNames);
} catch (e) {
  console.log('DynamoDB ListTables failed:', e.message);
}

// Check Lambda
const lambda = new LambdaClient({ region, credentials });
try {
  const fns = await lambda.send(new ListFunctionsCommand({}));
  console.log('Lambda Functions count:', fns.Functions?.length);
} catch (e) {
  console.log('Lambda ListFunctions failed:', e.message);
}

// Check API Gateway
const apigw = new ApiGatewayV2Client({ region, credentials });
try {
  const apis = await apigw.send(new GetApisCommand({}));
  console.log('API Gateway count:', apis.Items?.length);
} catch (e) {
  console.log('API Gateway GetApis failed:', e.message);
}
