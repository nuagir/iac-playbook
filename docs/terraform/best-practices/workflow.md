---
sidebar_position: 6
title: Workflow
---

# Workflow

## Never Apply Locally Against Production

All production changes must go through the CI/CD pipeline. Developer machines may run `apply` only against personal sandbox environments.

## Formatting & Validation

Run the following before every commit:

```bash
terraform fmt -recursive
terraform validate
```

Automate both in a pre-commit hook and in CI.

## Drift Detection

Schedule a regular `terraform plan` run (e.g. nightly) against each environment and alert on any drift. Unplanned drift is a signal of out-of-band changes that need to be reconciled.
