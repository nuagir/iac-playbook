---
sidebar_position: 12
title: Lifecycle & Version Management
---

# Lifecycle & Version Management

## Destroy Protection

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
