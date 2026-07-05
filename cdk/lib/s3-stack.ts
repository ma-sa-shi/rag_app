import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';

interface S3StackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class S3Stack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly vpcEndpoint: ec2.GatewayVpcEndpoint;

  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props);

    const appName = 'rag-app';

    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${appName}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      // SSE-S3で暗号化
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      lifecycleRules: [
        {
          id: 'intelligent-tiering',
          enabled: true,
          // Intelligent-Tieringを即時適用
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(0),
            },
          ],
        },
        // 未完了マルチパートアップロードを3日間保持
        {
          id: 'abort-incomplete-multipart',
          enabled: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(3),
        },
      ],
      // 実際にユーザーのデータが入る運用フェーズに入ったら、
      // removalPolicy: RETAIN / autoDeleteObjects: false に戻すこと。
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    // ECSからS3へのアクセスがインターネットを経由しない
    this.vpcEndpoint = new ec2.GatewayVpcEndpoint(this, 'S3VpcEndpoint', {
      vpc: props.vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });
  }
}
