---
sidebar_position: 3
title: Best Practices
---

# Best Practices

## Code Organization

### Repository Layout

Use a mono-repo structure with a clear separation between live infrastructure and reusable modules:

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   └── prod/
└── modules/
    ├── networking/
    ├── rds_cluster/
    └── ecs_service/
```

- Each environment directory is an independent root module with its own state file.
- Shared logic lives exclusively in `modules/`; copy-paste between environments is a red flag.

### File Layout Within a Module

Every Terraform root module and reusable module must follow this file layout:

| File | Purpose |
|---|---|
| `main.tf` | Core resource declarations |
| `variables.tf` | All `variable` blocks with descriptions and types |
| `outputs.tf` | All `output` blocks |
| `versions.tf` | `terraform` block with `required_version` and `required_providers` |
| `locals.tf` | All `local` blocks (omit if empty) |
| `data.tf` | All `data` source blocks (omit if empty) |

Do not create files named `resources.tf` or split resources arbitrarily across files. Group by logical concern when a module is large (e.g. `iam.tf`, `security_groups.tf`).

## Variables & Inputs

- Always declare a `type` and `description` for every variable.
- Use `validation` blocks for constrained inputs.
- Do not use `default = null` as a lazy way to make a variable optional — model optionality explicitly.

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment. One of: dev, staging, prod."

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}
```

- Sensitive values must be declared with `sensitive = true`.

```hcl
variable "db_password" {
  type        = string
  description = "Master password for the RDS instance."
  sensitive   = true
}
```

## Outputs

- Every module must export all resource attributes that a caller might need.
- Mark outputs as `sensitive = true` when they contain secret material.
- Always include a `description`.

```hcl
output "rds_endpoint" {
  description = "Connection endpoint for the RDS cluster."
  value       = aws_rds_cluster.main.endpoint
}
```

## Providers

- Pin provider versions using `~>` (pessimistic constraint) to allow patch updates but prevent major-version surprises.
- Declare all providers in `versions.tf`, never inline in `main.tf`.
- Pass provider configuration through root modules; never hardcode regions or accounts inside modules.

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Modules

- Prefer small, single-purpose modules over large all-in-one modules.
- Use versioned module references in production root modules (Git tag or registry version).
- Never call a module from inside another module more than one level deep — keep the module graph shallow.
- Pass only what a module needs; avoid forwarding the entire `var.*` scope.

## Secrets Management

- Never commit secrets, passwords, or API keys to version control — not even in `*.tfvars` files.
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault) and reference secrets via data sources.
- Use environment variables (`TF_VAR_*`) to inject sensitive values in CI/CD.

```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "/${var.environment}/payments/db-password"
}
```

## Workflow

### Never Apply Locally Against Production

All production changes must go through the CI/CD pipeline. Developer machines may run `apply` only against personal sandbox environments.

### Formatting & Validation

Run the following before every commit:

```bash
terraform fmt -recursive
terraform validate
```

Automate both in a pre-commit hook and in CI.

### Drift Detection

Schedule a regular `terraform plan` run (e.g. nightly) against each environment and alert on any drift. Unplanned drift is a signal of out-of-band changes that need to be reconciled.

## CI/CD Pipeline

### Core Workflow

Every Terraform change follows a strict plan-then-apply flow. The plan output is saved as an artifact and the apply step uses only that artifact — ensuring what was reviewed is exactly what gets applied.

```
Pull Request opened
       │
       ▼
  terraform fmt --check
  terraform validate
  terraform plan -out=tfplan     ← plan posted as PR comment
       │
       ▼
  PR approved & merged to main
       │
       ▼
  terraform apply tfplan          ← uses the saved plan artifact
```

### GitHub Actions — Core Workflow

The following workflow runs `plan` on every pull request and `apply` on merge to `main`. It uses OIDC authentication (no long-lived secrets stored in GitHub).

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write   # required for OIDC
  contents: read
  pull-requests: write

env:
  TF_VERSION: "1.9.0"
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
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
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

### Multi-Environment Pipeline

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
  push:
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
          terraform_version: "1.9.0"
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
          terraform_version: "1.9.0"
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
          terraform_version: "1.9.0"
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

**GitHub Environment configuration** (set in repository Settings → Environments):

| Environment | Required reviewers | Wait timer | Deployment branches |
|---|---|---|---|
| `dev` | None | None | `main` |
| `staging` | None | None | `main` |
| `prod` | 1+ approver | Optional (e.g. 5 min) | `main` only |

### OIDC Authentication

Never store cloud credentials as long-lived GitHub secrets. Use OpenID Connect (OIDC) so GitHub Actions can assume a scoped IAM role directly.

**AWS example — IAM role trust policy:**

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

## Lifecycle & Destroy Protection

Use `prevent_destroy` on stateful resources to guard against accidental deletion:

```hcl
resource "aws_rds_cluster" "main" {
  # ...

  lifecycle {
    prevent_destroy = true
  }
}
```

Use `ignore_changes` sparingly and only for attributes managed outside Terraform (e.g. auto-scaling desired counts):

```hcl
lifecycle {
  ignore_changes = [desired_count]
}
```

## Terraform Version Management

Use [tfenv](https://github.com/tfutils/tfenv) or [mise](https://mise.jdx.dev/) to pin the Terraform version per repository. Commit a `.terraform-version` or `mise.toml` file so all developers and CI use the same binary.
