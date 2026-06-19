---
sidebar_position: 2
title: Variables & Outputs
---

# Variables & Outputs

## Variables & Inputs

- Always declare a `type` and `description` for every variable.
- Use `validation` blocks for constrained inputs.
- Do not use `default = null` as a lazy way to make a variable optional. Model optionality explicitly.

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
