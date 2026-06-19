---
sidebar_position: 1
title: Overview
---

# Terraform

This section documents our opinionated approach to writing, organizing, and operating Terraform code. It covers naming conventions, structural guidelines, state management, and everyday best practices that every engineer working on infrastructure should follow.

## Sections

| Section | Description |
|---|---|
| [Naming Conventions](./naming-conventions) | Standardized resource and variable naming patterns |
| [Backends](./backends) | Remote state configuration and locking strategies |
| [Module Structure](./module-structure) | How to structure reusable Terraform modules |
| [Code Organization](./code-organization) | Repository layout and file structure guidelines |
| [Variables & Outputs](./variables-and-outputs) | Variable typing, validation, and output conventions |
| [Providers](./providers) | Provider version pinning and configuration |
| [Modules](./modules) | Module design principles |
| [Secrets Management](./secrets-management) | Keeping secrets out of version control |
| [Workflow](./workflow) | Local vs. CI/CD apply rules, formatting, and drift detection |
| [CI/CD Pipeline](./cicd-pipeline) | GitHub Actions workflows and multi-environment pipeline setup |
| [Lifecycle & Version Management](./lifecycle) | Destroy protection and Terraform version pinning |

## Guiding Principles

- **Consistency over preference:** follow the patterns in this playbook even when you disagree; raise a discussion to change the standard instead of diverging silently.
- **Least privilege by default:** every IAM permission, policy, and role should grant only what is needed.
- **State is sacred:** treat the Terraform state as production data; protect it with encryption, access controls, and locking.
- **Code review everything:** no `terraform apply` runs directly from a developer machine against production; all changes go through CI/CD.
