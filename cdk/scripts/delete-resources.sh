#!/usr/bin/env bash
#
# delete-resources.sh
#
# cdk destroy 後もAWS上に残ってしまう物理名固定リソースを
# 強制的に削除するスクリプト（開発フェーズ専用）。
#
# 本番運用フェーズ（removalPolicy: RETAIN に戻した後）では絶対に使わないこと。
#
# 使い方:
#   ./scripts/delete-resources.sh            # 確認プロンプトあり
#   ./scripts/delete-resources.sh --yes      # 確認プロンプトなしで実行
#
set -uo pipefail

APP_NAME="rag-app"
REGION="${AWS_REGION:-ap-northeast-1}"
export AWS_DEFAULT_REGION="$REGION"
AUTO_YES=false

for arg in "$@"; do
  case "$arg" in
    --yes|-y) AUTO_YES=true ;;
  esac
done

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "=============================================="
echo " 削除対象アカウント: $ACCOUNT_ID"
echo " リージョン        : $REGION"
echo "=============================================="
echo "以下のリソースを完全に削除します（復元不可）:"
echo "  - S3 Bucket:        ${APP_NAME}-${ACCOUNT_ID} (中身も含めて全削除)"
echo "  - ECR Repository:   ${APP_NAME}-backend, ${APP_NAME}-frontend"
echo "  - Secrets Manager:  /${APP_NAME}/database/credentials (復元期間を無視して即時削除)"
echo "  - IAM Role:         github-actions-app-deploy-role, github-actions-cdk-deploy-role"
echo "  - CloudMap Namespace: ${APP_NAME}.business-efficiency.pro"
echo "=============================================="

if [ "$AUTO_YES" != true ]; then
  read -r -p "本当に削除しますか？ 'yes' と入力してください: " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "キャンセルしました。"
    exit 1
  fi
fi

echo ""
echo "## 1. S3 Bucket を空にして削除"
BUCKET="${APP_NAME}-${ACCOUNT_ID}"
if aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  # バージョニング無効前提だが、念のためバージョン/削除マーカーも掃除
  aws s3api delete-objects --bucket "$BUCKET" \
    --delete "$(aws s3api list-object-versions --bucket "$BUCKET" \
      --output=json --query='{Objects: Versions[].{Key:Key,VersionId:VersionId}}')" \
    >/dev/null 2>&1 || true
  aws s3api delete-objects --bucket "$BUCKET" \
    --delete "$(aws s3api list-object-versions --bucket "$BUCKET" \
      --output=json --query='{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')" \
    >/dev/null 2>&1 || true
  aws s3 rm "s3://${BUCKET}" --recursive >/dev/null 2>&1 || true
  aws s3api delete-bucket --bucket "$BUCKET" && echo "  削除完了: $BUCKET" \
    || echo "  削除失敗（手動確認が必要）: $BUCKET"
else
  echo "  スキップ: $BUCKET は存在しません"
fi

echo ""
echo "## 2. ECR Repository をイメージごと強制削除"
for repo in "${APP_NAME}-backend" "${APP_NAME}-frontend"; do
  if aws ecr describe-repositories --repository-names "$repo" >/dev/null 2>&1; then
    aws ecr delete-repository --repository-name "$repo" --force \
      && echo "  削除完了: $repo" \
      || echo "  削除失敗: $repo"
  else
    echo "  スキップ: $repo は存在しません"
  fi
done

echo ""
echo "## 3. Secrets Manager を復元期間無視で即時削除"
SECRET_ID="/${APP_NAME}/database/credentials"
if aws secretsmanager describe-secret --secret-id "$SECRET_ID" >/dev/null 2>&1; then
  aws secretsmanager delete-secret \
    --secret-id "$SECRET_ID" \
    --force-delete-without-recovery \
    && echo "  削除完了: $SECRET_ID" \
    || echo "  削除失敗: $SECRET_ID"
else
  echo "  スキップ: $SECRET_ID は存在しません"
fi

echo ""
echo "## 4. IAM Role を削除（アタッチ済みポリシーを先にデタッチ）"
for role in "github-actions-app-deploy-role" "github-actions-cdk-deploy-role"; do
  if aws iam get-role --role-name "$role" >/dev/null 2>&1; then
    # マネージドポリシーのデタッチ
    for policy_arn in $(aws iam list-attached-role-policies --role-name "$role" \
      --query 'AttachedPolicies[].PolicyArn' --output text); do
      aws iam detach-role-policy --role-name "$role" --policy-arn "$policy_arn"
    done
    # インラインポリシーの削除
    for policy_name in $(aws iam list-role-policies --role-name "$role" \
      --query 'PolicyNames[]' --output text); do
      aws iam delete-role-policy --role-name "$role" --policy-name "$policy_name"
    done
    aws iam delete-role --role-name "$role" \
      && echo "  削除完了: $role" \
      || echo "  削除失敗: $role"
  else
    echo "  スキップ: $role は存在しません"
  fi
done

echo ""
echo "## 5. CloudMap Namespace を削除"
NS_ID=$(aws servicediscovery list-namespaces \
  --query "Namespaces[?Name=='${APP_NAME}.business-efficiency.pro'].Id" \
  --output text)
if [ -n "$NS_ID" ]; then
  # namespace内にサービスが残っていると削除できないため先に確認
  SERVICES=$(aws servicediscovery list-services \
    --filters "Name=NAMESPACE_ID,Values=${NS_ID}" \
    --query 'Services[].Id' --output text)
  if [ -n "$SERVICES" ]; then
    echo "  警告: namespace内にサービスが残っています。先にECSサービス/クラスターの削除を確認してください: $SERVICES"
  else
    aws servicediscovery delete-namespace --id "$NS_ID" \
      && echo "  削除完了: ${APP_NAME}.business-efficiency.pro" \
      || echo "  削除失敗: ${APP_NAME}.business-efficiency.pro"
  fi
else
  echo "  スキップ: namespace は存在しません"
fi

echo ""
echo "=============================================="
echo "処理完了。scripts/check-resources.sh で最終確認してください。"
echo "=============================================="
