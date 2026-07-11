---
name: cdk-deploy
description: Safely diff and deploy ai_app AWS infrastructure via CDK (VpcStack -> EfsStack/RdsStack/S3Stack -> EcsStack, with IamStack independent). Use before running npm run diff, deploy, or destroy in cdk/
---

# CDK deployment rules

## Critical rules

Always:

- Treat every deployment as production.
- Run `npm run diff` before every deployment.
- Show the diff to the user.
- Wait for explicit confirmation after the diff before running `npm run deploy` or `npm run destroy`.

Never:

- Treat CDK operations as a sandbox.
- Assume previous approval covers future deployments.
- Deploy dependent stacks out of order.
- Use GitHub Actions for the initial deployment of a new AWS account.

---

## Single-stage environment

This project has a single AWS account and region.
There is no dev/staging environment. Every `npm run deploy` targets the same real infrastructure.
Treat every infrastructure change as production-impacting.

---

## Stack dependencies

The deployment dependency graph is:

```text
VpcStack
    ├── EfsStack
    ├── RdsStack
    └── S3Stack
            │
            ▼
         EcsStack
```

`VpcStack` must deploy first.
`EfsStack`, `RdsStack`, and `S3Stack` depend only on `VpcStack` and may deploy in any order.
`EcsStack` depends on all three and deploys last.
`IamStack` is completely independent. `cdk deploy --all` may deploy it anywhere in the dependency graph.
Never assume `IamStack` deploys after `EcsStack`.
Unless you've confirmed there is no dependency impact, deploy using `cdk deploy --all` rather than selecting stacks manually.

---

## Always diff before deploy

Before every deployment:

1. Run `npm run diff`.
2. Show the diff.
3. Wait for explicit user approval.
4. Only then run `npm run deploy`.

The diff is the primary safety check because this project has no effective CDK test suite.

Infrastructure changes can affect:

- RDS
- EFS-backed Chroma persistence
- Cloudflare Tunnel connectivity
- ECS/Fargate SPOT services

---

## CDK tests

Do not rely on `npm test` when evaluating infrastructure changes.
`cdk/test/` only contains a stale commented example. Passing tests are **not** evidence that an infrastructure change is safe.
Always use the CDK diff as the safety signal.

---

## EFS / Chroma persistence

If changes affect `EcsStack` or `EfsStack`:

- Verify the container still runs as UID 1000.
- Verify the EFS access point configuration remains compatible.
- Warn the user if either changes.
  The EFS access point is pinned to UID 1000 and Chroma stores persistent data under `/chroma`. UID or access point changes can silently break persistence.

---

## Destroy workflow

After `npm run destroy`:

1. Run `cdk/scripts/check-resources.sh`.
2. Confirm physical-name resources were actually removed.
3. Only use `cdk/scripts/delete-resources.sh` if leftover resources prevent rebuilding the environment.

`delete-resources.sh` is a recovery utility, not part of normal deployment.

Destroying `EcsStack` resets the ECS desired-count state.

The ECS services' running state is managed by scheduled Auto Scaling, not by `cdk deploy`.

After recreating `EcsStack`, the application remains stopped until either:

- the scheduled scale-up runs, or
- `aws ecs update-service --desired-count 1` is executed manually.

Warn the user before destroying `EcsStack`.

---

## Initial deployment

GitHub Actions cannot perform the first deployment of a new AWS account because the deployment IAM roles are created by `IamStack`.

Bootstrap a new environment locally:

```bash
cd cdk
npm run bootstrap
npm run deploy
```

After the initial bootstrap completes, use GitHub Actions for routine deployments.

---

## Routine deployment

Routine deployments use GitHub Actions.

- Infrastructure updates use `deploy-infra.yml`.
- Backend updates use `deploy-backend.yml`.
- Frontend updates use `deploy-frontend.yml`.

Use local `npm run deploy` and `npm run destroy` only for:

- initial bootstrap
- infrastructure maintenance
- recovery
- rebuilding the environment

Do not recommend manual CDK deployment when a GitHub Actions workflow is the normal path.
