import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';

interface EfsStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class EfsStack extends cdk.Stack {
  public readonly fileSystem: efs.FileSystem;
  public readonly chromaAccessPoint: efs.IAccessPoint;

  constructor(scope: Construct, id: string, props: EfsStackProps) {
    super(scope, id, props);

    this.fileSystem = new efs.FileSystem(this, 'FileSystem', {
      vpc: props.vpc,
      encrypted: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.fileSystem.connections.allowDefaultPortFrom(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      'Allow EFS access from within VPC'
    );

    this.chromaAccessPoint = this.fileSystem.addAccessPoint(
      'ChromaAccessPoint',
      {
        path: '/chroma',
        // ECS(UID: 1000)からフルアクセス権限
        createAcl: { ownerUid: '1000', ownerGid: '1000', permissions: '755' },
        // 一律でUID:1000のユーザとしてEFSを操作させる
        posixUser: { uid: '1000', gid: '1000' },
      }
    );
  }
}
