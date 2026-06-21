---
sidebar_position: 3
title: Backends
---

# Backends

Terraform state is the source of truth for your infrastructure. Treat it with the same care as a production database.

## Remote State

Local state (`terraform.tfstate` on disk) is **never** acceptable outside of throwaway experiments. Every environment must use a remote backend. A remote backend stores state outside the local filesystem, on a managed service that provides locking, versioning, and access control.

Every environment must use a remote backend with:

- **Encryption at Rest**: State files contain sensitive resource attributes.
- **State Locking**: Prevents concurrent `apply` runs from corrupting state.
- **Versioning**: Allows rollback to a known-good state.
- **Restricted Access**: Least-privilege IAM/RBAC on the state store.

## Examples

Choose the backend that matches your cloud provider or CI/CD platform.

### AWS S3

```hcl
# versions.tf
terraform {
  backend "s3" {
    bucket  = "my-org-terraform-state-prod"
    key     = "payments/api/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
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

### Azure Blob Storage

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "my-org-terraform-state-rg"
    storage_account_name = "myorgterraformstate"
    container_name       = "tfstate"
    key                  = "payments/api/terraform.tfstate"
    use_oidc             = true
  }
}
```

## State File Naming Convention

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

## State Manipulation

Avoid direct state manipulation. When it is unavoidable (e.g. resource moves, import):

- Always take a manual backup (`terraform state pull > backup.tfstate`) before running `terraform state mv`, `rm`, or `import`.
- Use a `moved.tf` file to track resource moves with a reference ID in a comment for traceability.
- Document the reason in the commit message.

## Access Control

| Role | Permissions | Purpose |
|---|---|---|
| CI/CD pipeline | Read + write state, acquire/release locks | Runs `plan` and `apply` on behalf of merged PRs |
| Developers | Read state only | Allows local `terraform plan` without the ability to modify state |
| Administrators | Full access | Break-glass emergency access only |

Use separate IAM roles or service principals for CI/CD vs. developer access, never share credentials.

## Sensitive Values

Terraform stores sensitive resource attributes in the state file in plain text (even when marked `sensitive = true` in configuration). This makes encryption at rest and strict access control non-negotiable.

Never log or print state file contents in CI output.
