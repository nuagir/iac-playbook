---
sidebar_position: 9
title: CI/CD Pipeline
---

# CI/CD Pipeline

All Ansible changes must pass through a CI/CD pipeline before reaching any managed environment. No playbook may be run manually against staging or production.

## Pipeline Stages

| Stage | Tool | Purpose |
|---|---|---|
| Lint | `ansible-lint` | Enforce coding standards and catch common mistakes |
| Syntax Check | `ansible-playbook --syntax-check` | Validate YAML and Ansible syntax |
| Molecule Test | `molecule test` | Run role-level unit and integration tests |
| Check Mode | `ansible-playbook --check --diff` | Dry-run against the target environment |
| Deploy | `ansible-playbook` | Apply changes to the target environment |

## GitHub Actions Example

```yaml
name: Ansible CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Install Ansible collections
        run: ansible-galaxy collection install -r collections/requirements.yml

      - name: Run ansible-lint
        run: ansible-lint

      - name: Run syntax check
        run: |
          ansible-playbook playbooks/site.yml --syntax-check \
            -i inventories/staging/hosts.yml

  molecule:
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        role:
          - webserver
          - postgresql_server
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run Molecule tests
        run: molecule test
        working-directory: roles/${{ matrix.role }}

  deploy-staging:
    runs-on: ubuntu-latest
    needs: molecule
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Deploy to staging
        run: |
          ansible-playbook playbooks/site.yml \
            -i inventories/staging/hosts.yml
        env:
          ANSIBLE_VAULT_PASSWORD: ${{ secrets.ANSIBLE_VAULT_PASSWORD }}
```

## Dependencies

Pin all Python dependencies:

```
ansible-core==2.17.*
ansible-lint==24.*
molecule==24.*
molecule-plugins[docker]==23.*
```

## Linting Configuration

Place an `.ansible-lint` file at the repository root:

```yaml
# .ansible-lint
profile: production

exclude_paths:
  - .cache/
  - collections/

warn_list:
  - yaml[line-length]

skip_list: []
```

The `production` profile enforces the strictest rule set. Downgrade to `basic` only with explicit justification in the PR description.

## Branch Protection

Require all three CI jobs (`lint`, `molecule`, `deploy-staging`) to pass before a pull request can merge to `main`. Enable required reviews from at least one team member.
