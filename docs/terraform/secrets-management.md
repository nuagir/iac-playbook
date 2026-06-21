---
sidebar_position: 9
title: Secrets Management
---

# Secrets Management

- Never commit secrets, passwords, or API keys to version control.
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault) and reference secrets via data sources.
- Use environment variables (`TF_VAR_*`) to inject sensitive values in CI/CD.

```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "/${var.environment}/payments/db-password"
}
```
