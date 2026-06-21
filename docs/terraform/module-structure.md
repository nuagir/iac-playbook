---
sidebar_position: 4
title: Module Structure
---

# Module Structure

Modules are the primary reuse mechanism in Terraform. A well-structured module is self-documenting, easy to test, and safe to version independently.

## When to Create a Module

Create a module when:

- The same set of resources is deployed in more than one place with only minor differences.
- A group of resources represents a coherent infrastructure concept (e.g. "an ECS service with its IAM role and security group").
- You need to enforce organizational standards for a resource type.

Do **not** create a module just to wrap a single resource. The overhead is not worth it. A `locals` block and good variable names inside a root module are sufficient.

## Directory Layout

```
modules/
└── ecs_service/
    ├── main.tf          # Core resources
    ├── variables.tf     # All inputs
    ├── outputs.tf       # All outputs
    ├── versions.tf      # required_version + required_providers
    ├── locals.tf        # Derived values (optional)
    ├── data.tf          # Data sources (optional)
    └── README.md        # Usage example, inputs/outputs table
```

## Variables

Every variable needs a type, description, and (where appropriate) validation:

```hcl
variable "name" {
  type        = string
  description = "Name of the ECS service. Used as a prefix for all child resources."
}

variable "cluster_arn" {
  type        = string
  description = "ARN of the ECS cluster to deploy into."
}

variable "container_image" {
  type        = string
  description = "Docker image URI including tag (e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/app:1.2.3)."
}

variable "desired_count" {
  type        = number
  description = "Desired number of running tasks."
  default     = 2

  validation {
    condition     = var.desired_count >= 1
    error_message = "desired_count must be at least 1."
  }
}

variable "tags" {
  type        = map(string)
  description = "Additional tags to merge with the module's default tags."
  default     = {}
}
```

## Outputs

Export everything a caller might need; avoid forcing callers to reconstruct IDs themselves:

```hcl
output "service_arn" {
  description = "ARN of the ECS service."
  value       = aws_ecs_service.this.id
}

output "task_definition_arn" {
  description = "ARN of the task definition revision deployed."
  value       = aws_ecs_task_definition.this.arn
}

output "security_group_id" {
  description = "ID of the security group attached to the ECS tasks."
  value       = aws_security_group.tasks.id
}
```

## Providers

```hcl
terraform {
  required_version = ">= 1.15.1"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Versioning Modules

Tag modules with semantic versions and reference them by tag in root modules:

```hcl
# Consuming root module
module "api_service" {
  source = "git::https://github.com/my-org/infrastructure.git//modules/ecs_service?ref=v1.4.0"

  name            = "payments-api"
  cluster_arn     = data.terraform_remote_state.platform.outputs.ecs_cluster_arn
  container_image = "123456789.dkr.ecr.us-east-1.amazonaws.com/payments-api:${var.image_tag}"
  desired_count   = 3
  tags            = local.common_tags
}
```

Use `ref=` to pin to a tag, never to a branch name in production.

## Documentation

Use [terraform-docs](https://terraform-docs.io/) to auto-generate the `README.md` for every module. Never write the inputs/outputs table by hand.

```bash
terraform-docs markdown table --output-file README.md --output-mode inject .
```

Add a `.terraform-docs.yml` at the module root to control output:

```yaml
formatter: markdown table

output:
  file: README.md
  mode: inject

sections:
  show:
    - inputs
    - outputs
    - requirements
    - providers
```

Run terraform-docs in CI on every pull request that modifies a module to keep documentation in sync. The `inject` mode writes between `<!-- BEGIN_TF_DOCS -->` / `<!-- END_TF_DOCS -->` markers, so a hand-written usage example above the markers is preserved.

## Testing Modules

Use [Terratest](https://terratest.gruntwork.io/) or [tftest](https://github.com/GoogleCloudPlatform/terraform-cloud-modules-tftest) to write automated tests for modules. At minimum, every module should have:

1. A `examples/basic/` directory with a minimal working configuration.
2. A test that runs `terraform init`, `plan`, `apply`, and `destroy` against the example.

Tests run in CI on every pull request that modifies a module.
