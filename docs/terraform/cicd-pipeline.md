---
sidebar_position: 10
title: CI/CD Pipeline
---

# CI/CD Pipeline

All production changes must go through the CI/CD pipeline. Developer machines may run `apply` only against personal sandbox environments.

## Validations

Run the following before every commit:

```bash
terraform fmt -recursive
terraform validate
tflint
```

Automate both in a pre-commit hook and in CI.

## Drift Detection

Schedule a regular `terraform plan` run (e.g. nightly) against each environment and alert on any drift. Unplanned drift is a signal of out-of-band changes that need to be reconciled.

## Core Workflow

Every Terraform change follows a strict plan-then-apply flow. The plan output is saved as an artifact and the apply step uses only that artifact, ensuring what was reviewed is exactly what gets applied.

```
Pull Request opened
       │
       ▼
  terraform fmt --check
  terraform validate
  tflint
  terraform plan -out=tfplan     ← plan posted as PR comment
       │
       ▼
  PR approved & merged to main
       │
       ▼
  terraform apply tfplan          ← uses the saved plan artifact
```

## GitHub Actions

The following workflow runs `plan` on every pull request. A merged PR to `main` is required before `apply` runs. It uses OIDC authentication (no long-lived secrets stored in GitHub).

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  pull_request:
    branches: [main]

permissions:
  id-token: write   # required for OIDC
  contents: read
  pull-requests: write

env:
  TF_VERSION: "1.15.3"
  WORKING_DIR: environments/prod

jobs:
  plan:
    name: Plan
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ env.WORKING_DIR }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Terraform Validate
        run: terraform validate

      - name: TFLint
        uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: latest
      - run: tflint --init && tflint

      - name: Terraform Plan
        id: plan
        run: terraform plan -out=tfplan -no-color 2>&1 | tee plan.txt

      - name: Post plan to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('${{ env.WORKING_DIR }}/plan.txt', 'utf8');
            const body = `### Terraform Plan\n\`\`\`\n${plan.slice(0, 65000)}\n\`\`\``;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            });

      - name: Upload plan artifact
        uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: ${{ env.WORKING_DIR }}/tfplan
          retention-days: 7

  apply:
    name: Apply
    runs-on: ubuntu-latest
    needs: plan
    if: github.event_name == 'pull_request' && github.event.pull_request.merged == true
    defaults:
      run:
        working-directory: ${{ env.WORKING_DIR }}

    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        run: terraform init

      - name: Download plan artifact
        uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: ${{ env.WORKING_DIR }}

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
```

## Multi-Environment

For multiple environments (`dev`, `staging`, `prod`), use a promotion model: changes flow through each environment in sequence with a mandatory approval gate before reaching production.

```
main branch push
       │
       ▼
  Deploy → dev       (automatic, no approval)
       │
       ▼
  Deploy → staging   (automatic after dev succeeds)
       │
       ▼
  Manual approval ──── GitHub Environment protection rule
       │
       ▼
  Deploy → prod
```

Each environment maps to its own workflow job with a separate working directory and IAM role. GitHub Environments provide the approval gates.

```yaml
# .github/workflows/terraform-multi-env.yml
name: Terraform Multi-Environment

on:
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy-dev:
    name: Deploy (dev)
    runs-on: ubuntu-latest
    environment: dev
    env:
      WORKING_DIR: environments/dev
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.15.3"
      - name: Configure credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.DEV_AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: terraform init
        working-directory: ${{ env.WORKING_DIR }}
      - run: terraform apply -auto-approve
        working-directory: ${{ env.WORKING_DIR }}

  deploy-staging:
    name: Deploy (staging)
    runs-on: ubuntu-latest
    needs: deploy-dev
    environment: staging
    env:
      WORKING_DIR: environments/staging
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.15.3"
      - name: Configure credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.STAGING_AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: terraform init
        working-directory: ${{ env.WORKING_DIR }}
      - run: terraform apply -auto-approve
        working-directory: ${{ env.WORKING_DIR }}

  deploy-prod:
    name: Deploy (prod)
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment: prod          # ← requires manual approval in GitHub
    env:
      WORKING_DIR: environments/prod
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.15.3"
      - name: Configure credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.PROD_AWS_ROLE_ARN }}
          aws-region: us-east-1
      - run: terraform init
        working-directory: ${{ env.WORKING_DIR }}
      - run: terraform apply -auto-approve
        working-directory: ${{ env.WORKING_DIR }}
```

**GitHub Environment configuration** (set in repository Settings > Environments):

| Environment | Required reviewers | Wait timer | Deployment branches |
|---|---|---|---|
| `dev` | None | None | `main` |
| `staging` | None | None | `main` |
| `prod` | 1+ approver | Optional (e.g. 5 min) | `main` only |

## OIDC Authentication

Never store cloud credentials as long-lived GitHub secrets. Use OpenID Connect (OIDC) so GitHub Actions can assume a scoped IAM role directly.

### AWS

IAM role trust policy:

```json
{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:my-org/infrastructure:*"
    }
  }
}
```

Each environment (`dev`, `staging`, `prod`) must have its own IAM role with the minimum permissions needed to apply that environment's Terraform code.

### Azure

Create an App Registration in Entra ID and add a federated credential instead of storing a client secret.

**Federated credential settings** (set in App Registration > Certificates & secrets > Federated credentials):

| Field | Value |
|---|---|
| Issuer | `https://token.actions.githubusercontent.com` |
| Subject identifier | `repo:my-org/infrastructure:environment:prod` |
| Audience | `api://AzureADTokenExchange` |

Use `environment:*` to scope to a specific GitHub Environment, or `ref:refs/heads/main` to scope to a branch. Never use `repo:my-org/infrastructure:*` (too broad) for production roles.

In the workflow, authenticate with the federated credential:

```yaml
- name: Configure Azure credentials (OIDC)
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

Assign the App Registration's service principal the minimum Azure RBAC role required (e.g. `Contributor` scoped to the target resource group, not the entire subscription). Each environment must use a separate App Registration.
