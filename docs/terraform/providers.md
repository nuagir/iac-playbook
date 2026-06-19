---
sidebar_position: 7
title: Providers
---

# Providers

- Pin provider versions using `~>` (pessimistic constraint) to allow patch updates but prevent major-version surprises.
- Declare all providers in `versions.tf`, never inline in `main.tf`.
- Pass provider configuration through root modules. Never hardcode regions or accounts inside modules.

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
