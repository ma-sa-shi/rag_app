import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/vpc-stack";
import { EfsStack } from "../lib/efs-stack";
import { RdsStack } from "../lib/rds-stack";
import { S3Stack } from "../lib/s3-stack";
import { EcsStack } from "../lib/ecs-stack";
import { IamStack } from "../lib/iam-stack";

const app = new cdk.App();

// cdk deploy -c stage=dev --all で渡す
const stage = app.node.tryGetContext("stage");
const isProd = stage === "prod";

const vpcStack = new VpcStack(app, "RagVpcStack", {
  description: "Network infrastructure for RAG Application",
});

const iamStack = new IamStack(app, "IamStack", {
  description: "IAM for RAG Application",
});

const efsStack = new EfsStack(app, "RagEfsStack", {
  vpc: vpcStack.vpc,
  description: "EFS storage for RAG Application",
});

const rdsStack = new RdsStack(app, "RagRdsStack", {
  vpc: vpcStack.vpc,
  isProd: isProd,
  description: "RDS MySQL instance for RAG Application",
});

const s3Stack = new S3Stack(app, "RagS3Stack", {
  vpc: vpcStack.vpc,
  isProd: isProd,
  description: "S3 bucket for RAG Application",
});

new EcsStack(app, "RagEcsStack", {
  vpc: vpcStack.vpc,
  fileSystem: efsStack.fileSystem,
  chromaAccessPoint: efsStack.chromaAccessPoint,
  dbInstance: rdsStack.dbInstance,
  dbSecurityGroup: rdsStack.dbSecurityGroup,
  mysqlRootPassword: rdsStack.mysqlRootPassword,
  bucket: s3Stack.bucket,
  isProd: isProd,
  description: "ECS Fargate services for RAG Application",
});
