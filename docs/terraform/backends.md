---
sidebar_position: 4
title: Backends & State
---

# Backends & State

Terraform state is the source of truth for your infrastructure. Treat it with the same care as a production database.

## Remote State is Mandatory

Local state (`terraform.tfstate` on disk) is **never** acceptable outside of throwaway experiments. Every environment must use a remote backend with:

- **Encryption at rest** — state files contain sensitive resource attributes.
- **State locking** — prevents concurrent `apply` runs from corrupting state.
- **Versioning** — allows rollback to a known-good state.
- **Restricted access** — least-privilege IAM/RBAC on the state store.

## Recommended Backends

### AWS S3 + DynamoDB

The standard backend for AWS workloads:

```hcl
# versions.tf
terraform {
  backend "s3" {
    bucket         = "nuagir-terraform-state-prod"
    key            = "payments/api/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "nuagir-terraform-locks"
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/mrk-abc123"
  }
}
```

**S3 bucket requirements:**

| Setting | Value |
|---|---|
| Versioning | Enabled |
| Server-side encryption | SSE-KMS (customer-managed key) |
| Block public access | All four settings enabled |
| Bucket policy | Deny `s3:DeleteObject` on state keys |

**DynamoDB table requirements:**

| Setting | Value |
|---|---|
| Partition key | `LockID` (String) |
| Billing mode | PAY_PER_REQUEST |
| Point-in-time recovery | Enabled |

### Azure Blob Storage

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "nuagir-terraform-state-rg"
    storage_account_name = "nuagirterraformstate"
    container_name       = "tfstate"
    key                  = "payments/api/terraform.tfstate"
    use_oidc             = true
  }
}
```

### HCP Terraform (Terraform Cloud)

For teams already on HCP Terraform, use the `remote` or `cloud` backend:

```hcl
terraform {
  cloud {
    organization = "nuagir"

    workspaces {
      name = "payments-api-prod"
    }
  }
}
```

## State File Key Convention

State file keys follow the same structure as the directory layout:

```
<project>/<component>/<environment>/terraform.tfstate
```

Examples:

```
payments/api/prod/terraform.tfstate
payments/rds/prod/terraform.tfstate
platform/networking/staging/terraform.tfstate
```

Never share a single state file between multiple components or environments.

## State Isolation

Each combination of `(project, component, environment)` must have its own state file. This limits the blast radius of any single `apply` and allows independent promotion of changes across environments.

## Accessing Remote State from Other Modules

Use `terraform_remote_state` to share outputs between root modules. Prefer this over duplicating resource definitions.

```hcl
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "nuagir-terraform-state-prod"
    key    = "platform/networking/prod/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
  # ...
}
```

> Prefer data sources (e.g. `aws_vpc`, `aws_subnet`) over `terraform_remote_state` when the consuming module has no ownership relationship with the producing module — it decouples the two root modules.

## State Manipulation

Avoid direct state manipulation. When it is unavoidable (e.g. resource moves, import):

- Always take a manual backup (`terraform state pull > backup.tfstate`) before running `terraform state mv`, `rm`, or `import`.
- Run in a branch, plan after the manipulation, and get a peer review before applying.
- Document the reason in the commit message.

## Access Control

| Role | Permissions |
|---|---|
| CI/CD pipeline | Read + write state, acquire/release locks |
| Developers | Read state only (for `terraform plan` locally) |
| Administrators | Full access (break-glass only) |

Use separate IAM roles or service principals for CI/CD vs. developer access; never share credentials.

## Sensitive Values in State

Terraform stores sensitive resource attributes in the state file in plain text (even when marked `sensitive = true` in configuration). This makes encryption at rest and strict access control non-negotiable.

Never log or print state file contents in CI output.
