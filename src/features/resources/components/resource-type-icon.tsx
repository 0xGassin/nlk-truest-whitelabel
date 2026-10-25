import { AthenaIcon } from "@/components/ui/svgs/aws-infrastructure/athena";
import { AwsIcon } from "@/components/ui/svgs/aws-infrastructure/aws";
import { CloudformationIcon } from "@/components/ui/svgs/aws-infrastructure/cloudformation";
import { CloudwatchIcon } from "@/components/ui/svgs/aws-infrastructure/cloudwatch";
import { Ec2Icon } from "@/components/ui/svgs/aws-infrastructure/ec2";
import { EcrIcon } from "@/components/ui/svgs/aws-infrastructure/ecr";
import { IamIcon } from "@/components/ui/svgs/aws-infrastructure/iam";
import { KmsIcon } from "@/components/ui/svgs/aws-infrastructure/kms";
import { LambdaIcon } from "@/components/ui/svgs/aws-infrastructure/lambda";
import { RdsIcon } from "@/components/ui/svgs/aws-infrastructure/rds";
import { S3Icon } from "@/components/ui/svgs/aws-infrastructure/s3";
import { VpcIcon } from "@/components/ui/svgs/aws-infrastructure/vpc";
import { GcpFirewallIcon } from "@/components/ui/svgs/gcp-firewall";
import { GcpLoggingIcon } from "@/components/ui/svgs/gcp-logging";
import { GcpServiceAccountIcon } from "@/components/ui/svgs/gcp-service-account";
import { GcpStorageBucketIcon } from "@/components/ui/svgs/gcp-storage-bucket";
import { GcpVpcIcon } from "@/components/ui/svgs/gcp-vpc";
import { GitHub } from "@/components/ui/svgs/github";

export function ResourceTypeIcon({ className, type }: { className?: string; type: string }) {
  if (type.startsWith("ec2:") && type !== "ec2:vpc" && type !== "ec2:route_table" && type !== "ec2:subnet" && type !== "ec2:security_group") {
    return <Ec2Icon className={className} />;
  }

  switch (type) {
    case "athena:workgroup":
      return <AthenaIcon className={className} />;
    case "cloudformation:stack":
      return <CloudformationIcon className={className} />;
    case "cloudstorage.googleapis.com/Bucket":
      return <GcpStorageBucketIcon className={className} />;
    case "cloudwatch:alarm":
    case "cloudwatch:log_group":
    case "cloudwatch:metric_filter":
      return <CloudwatchIcon className={className} />;
    case "compute.googleapis.com/Firewall":
      return <GcpFirewallIcon className={className} />;
    case "compute.googleapis.com/Network":
    case "compute.googleapis.com/Subnet":
    case "compute.googleapis.com/Subnetwork":
      return <GcpVpcIcon className={className} />;
    case "ec2:route_table":
    case "ec2:security_group":
    case "ec2:subnet":
    case "ec2:vpc":
      return <VpcIcon className={className} />;
    case "ecr:registry":
      return <EcrIcon className={className} />;
    case "ecr:repository":
      return <AwsIcon className={className} />;
    case "github:repository":
      return <GitHub className={className} />;
    case "iam:policy":
    case "iam:role":
    case "iam:user":
      return <IamIcon className={className} />;
    case "iam.googleapis.com/ServiceAccount":
    case "iam.googleapis.com/ServiceAccountKey":
      return <GcpServiceAccountIcon className={className} />;
    case "kms:key":
      return <KmsIcon className={className} />;
    case "lambda:function":
      return <LambdaIcon className={className} />;
    case "logging.googleapis.com/LogBucket":
    case "logging.googleapis.com/LogSink":
      return <GcpLoggingIcon className={className} />;
    case "rds:cluster":
    case "rds:instance":
    case "rds:snapshot":
      return <RdsIcon className={className} />;
    case "s3:access_point":
    case "s3:account":
    case "s3:bucket":
      return <S3Icon className={className} />;
    default:
      return <AwsIcon className={className} />;
  }
}
