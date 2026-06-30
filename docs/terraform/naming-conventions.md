---
sidebar_position: 2
title: Naming Conventions
---

# Naming Conventions

Consistent naming reduces cognitive load and makes resources discoverable across the organization. All Terraform identifiers and cloud resource names must follow these conventions.

## General Rules

- Use **snake_case** for all Terraform identifiers (resources, variables, outputs, locals, modules).
- Use **kebab-case** for cloud resource names (the `name` argument passed to the provider).
- Never abbreviate when the full word is reasonably short. Prefer `database` over `db`, `network` over `net`.
- Avoid redundant prefixes. Do not repeat the resource type in the identifier (e.g. `resource "aws_s3_bucket" "assets"` not `resource "aws_s3_bucket" "s3_assets_bucket"`).

## Terraform Identifiers

```hcl
# Resource identifiers: <noun> describing what the resource does
resource "aws_vpc" "main" { ... }
resource "aws_subnet" "public" { ... }
resource "aws_iam_role" "lambda_execution" { ... }

# Data sources: same snake_case, suffix with _data only when the name clashes
data "aws_ami" "ubuntu" { ... }
data "aws_caller_identity" "current" { ... }

# Variables: descriptive, no type suffix
variable "environment" { ... }
variable "vpc_cidr_block" { ... }

# Outputs: match what they represent
output "vpc_id" { ... }
output "private_subnet_ids" { ... }

# Locals: use for derived or composed values
locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}
```

## Cloud Resource Names

Cloud resource names follow the pattern:

```
<organization>-<project>-<resource-descriptor>-<environment>
```

| Segment | Description | Example |
|---|---|---|
| `organization` | Short org or team identifier | `acme` |
| `project` | Project or service name | `payments` |
| `resource-descriptor` | What the resource does | `api-lb`, `rds-primary` |
| `environment` | Deployment tier | `prod`, `staging`, `dev` |

**Examples:**

```
acme-payments-api-lb-prod
acme-payments-rds-primary-staging
acme-platform-cache-dev
```

> For resources with strict name-length limits (e.g. AWS S3 buckets ≤ 63 chars, Azure storage accounts ≤ 24 chars), omit the organization prefix and use the shortest unambiguous descriptor.

## Variables

| Pattern | Good | Bad |
|---|---|---|
| Boolean variables | `enable_deletion_protection` | `deletion_protection_flag` |
| List/set variables | `allowed_cidr_blocks` | `cidr_list` |
| Map variables | `tags` | `tag_map` |
| Numeric variables | `replica_count` | `num_replicas` |

## Modules

Module source directories and calls use snake_case:

```hcl
module "networking" {
  source = "../../modules/networking"
}

module "rds_cluster" {
  source = "../../modules/rds_cluster"
}
```

## Tags

All resources must include a common set of tags applied via `locals.common_tags`. Additional resource-specific tags are merged on top.

```hcl
locals {
  common_tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
    repository  = "github.com/my-org/infrastructure"
  }
}

resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets"

  tags = merge(local.common_tags, {
    purpose = "static-assets"
  })
}
```

Required tags on all resources:

| Tag | Description |
|---|---|
| `project` | The project or service this resource belongs to |
| `environment` | The deployment environment (`dev`, `staging`, `prod`) |
| `managed_by` | Always `terraform` |
| `repository` | The source repository URL |
