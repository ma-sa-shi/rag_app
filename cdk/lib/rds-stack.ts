import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

interface RdsStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  isProd: boolean;
}

export class RdsStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly mysqlRootPassword: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    const appName = 'rag-app';
    const dbName = 'db';

    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for RDS MySQL instance',
      allowAllOutbound: true,
    });

    this.mysqlRootPassword = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: `/${appName}/database/credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'root' }),
        generateStringKey: 'password',
        // パスワードに使うとエラーになりやすい文字を除外
        excludeCharacters: '"@/\\',
      },
    });

    // RDS MySQLインスタンス（t4g.micro + Single-AZ + gp2）
    this.dbInstance = new rds.DatabaseInstance(this, 'MysqlInstance', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_4_9,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [this.dbSecurityGroup],
      publiclyAccessible: false,
      credentials: rds.Credentials.fromSecret(this.mysqlRootPassword),
      databaseName: dbName,
      multiAz: false,
      storageType: rds.StorageType.GP2,
      allocatedStorage: 20,
      // ストレージの自動拡張を無効化
      maxAllocatedStorage: 20,
      storageEncrypted: true,
      backupRetention: props.isProd
        ? cdk.Duration.days(7)
        : cdk.Duration.days(1),
      deletionProtection: props.isProd,
      removalPolicy: props.isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      deleteAutomatedBackups: !props.isProd,
      // 監視用の有料オプションをオフ
      enablePerformanceInsights: false,
      // 拡張モニタリングをオフ
      monitoringInterval: cdk.Duration.seconds(0),
    });
  }
}
