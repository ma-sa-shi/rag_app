#!/usr/bin/env bash
#
# check-resources.sh
#
# cdk destroy 後に、衝突しやすい「物理名固定」リソースが
# 本当にAWS上から消えているかを確認するスクリプト。
#
# 使い方:
#   ./scripts/check-resources.sh
#   AWS_REGION=ap-northeast-1 ./scripts/check-resources.sh
#
set -uo pipefail  # 各チェックが失敗しても続行したい為-eを付けない

APP_NAME="rag-app"
REGION="${AWS_REGION:-ap-northeast-1}"
export AWS_DEFAULT_REGION="$REGION"

echo "Region: $REGION"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT_ID"
echo "----------------------------------------"

ok()   { echo "  [OK]    $1"; }
warn() { echo "  [残存]  $1"; }

echo "## 1. S3 Bucket"
BUCKET="${APP_NAME}-${ACCOUNT_ID}"
if aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  warn "$BUCKET がまだ存在します"
else
  ok "$BUCKET は存在しません"
fi

echo ""
echo "## 2. ECR Repositories"
for repo in "${APP_NAME}-backend" "${APP_NAME}-frontend"; do
  if aws ecr describe-repositories --repository-names "$repo" >/dev/null 2>&1; then
    warn "$repo がまだ存在します"
  else
    ok "$repo は存在しません"
  fi
done

echo ""
echo "## 3. Secrets Manager (削除予約状態にも注意)"
SECRET_ID="/${APP_NAME}/database/credentials"
SECRET_INFO=$(aws secretsmanager describe-secret --secret-id "$SECRET_ID" 2>&1)
if [ $? -eq 0 ]; then
  DELETED_DATE=$(echo "$SECRET_INFO" | grep -o '"DeletedDate": [^,]*' || true)
  if [ -n "$DELETED_DATE" ]; then
    warn "$SECRET_ID は削除予約中です（復元可能期間内）: $DELETED_DATE"
    echo "         → 即時再作成したい場合は delete-resources.sh を実行（Secrets Managerは即時強制削除されます）"
  else
    warn "$SECRET_ID がまだ有効な状態で存在します"
  fi
else
  ok "$SECRET_ID は存在しません"
fi

echo ""
echo "## 4. IAM Roles"
for role in "github-actions-app-deploy-role" "github-actions-cdk-deploy-role"; do
  if aws iam get-role --role-name "$role" >/dev/null 2>&1; then
    warn "$role がまだ存在します"
  else
    ok "$role は存在しません"
  fi
done

echo ""
echo "## 5. ECS Cluster"
CLUSTER_STATUS=$(aws ecs describe-clusters --clusters "${APP_NAME}-cluster" \
  --query "clusters[0].status" --output text 2>/dev/null)
if [ "$CLUSTER_STATUS" == "ACTIVE" ]; then
  warn "${APP_NAME}-cluster がACTIVE状態です"
elif [ "$CLUSTER_STATUS" == "None" ] || [ -z "$CLUSTER_STATUS" ]; then
  ok "${APP_NAME}-cluster は存在しません"
else
  ok "${APP_NAME}-cluster: $CLUSTER_STATUS"
fi

echo ""
echo "## 6. CloudMap Namespace"
NS_ID=$(aws servicediscovery list-namespaces \
  --query "Namespaces[?Name=='${APP_NAME}.business-efficiency.pro'].Id" \
  --output text)
if [ -n "$NS_ID" ]; then
  warn "namespace ${APP_NAME}.business-efficiency.pro がまだ存在します (Id: $NS_ID)"
else
  ok "namespace ${APP_NAME}.business-efficiency.pro は存在しません"
fi

echo ""
echo "## 7. CloudFormation Stacks"
for stack in RagVpcStack IamStack RagEfsStack RagRdsStack RagS3Stack RagEcsStack; do
  status=$(aws cloudformation describe-stacks --stack-name "$stack" \
    --query "Stacks[0].StackStatus" --output text 2>/dev/null)
  if [ -z "$status" ]; then
    ok "$stack: 削除済み"
  else
    warn "$stack: $status"
  fi
done

echo "----------------------------------------"
echo "確認完了。[残存] が1つでもあれば cdk deploy 前に対応してください。"
