---
sidebar_position: 5
title: Code Organization
---

# Code Organization

## Repository Layout

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
- Shared logic lives exclusively in `modules/`. Copy-paste between environments is a red flag.

## File Layout Within a Module

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
