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

### Plan Before Apply

Always run `terraform plan` and review the diff before applying, even in development. In CI/CD:

1. `terraform init`
2. `terraform validate`
3. `terraform plan -out=tfplan`
4. Human approval (for staging/prod)
5. `terraform apply tfplan`

### Never Apply Locally Against Production

All production changes must go through the CI/CD pipeline. Developer machines may run `apply` only against personal sandbox environments.

### Drift Detection

Schedule a regular `terraform plan` run (e.g. nightly) against each environment and alert on any drift. Unplanned drift is a signal of out-of-band changes that need to be reconciled.

### Formatting & Validation

Run the following before every commit:

```bash
terraform fmt -recursive
terraform validate
```

Automate both in a pre-commit hook and in CI.

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
