---
sidebar_position: 6
title: Variables & Outputs
---

# Variables & Outputs

## Variables

- Always declare a `type` and `description` for every variable.
- Do not use `default = null` as a lazy way to make a variable optional. Model optionality explicitly.

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment. One of: dev, staging, prod."
}
```

## Inputs

Use `validation` blocks to enforce constraints at plan time rather than letting invalid values propagate to the provider:

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

Sensitive values must be declared with `sensitive = true` to prevent them from appearing in plan output and logs:

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
