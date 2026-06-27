---
sidebar_position: 3
title: Naming Conventions
---

# Naming Conventions

Consistent naming reduces cognitive load and makes automation discoverable across the organization.

## General Rules

- Use **snake_case** for all Ansible identifiers: variables, role names, task names, handlers, and tags.
- Use **kebab-case** for directory names and filenames (except role directories, which use snake_case).
- Be descriptive. Prefer `webserver_port` over `port`, `db_replica_count` over `replicas`.
- Avoid abbreviations unless they are universally understood (e.g. `url`, `id`, `api`).

## Roles

Role names must describe what the role does, not what it targets:

```
# Good
webserver
postgresql_server
tls_certificate

# Bad
nginx          # Too implementation-specific; use webserver
my_role        # Meaningless
setup          # Too vague
```

## Variables

Follow the pattern `<role>_<noun>` to namespace role variables and prevent collisions:

```yaml
# Role: postgresql_server
postgresql_server_version: "15"
postgresql_server_port: 5432
postgresql_server_data_dir: /var/lib/postgresql/15/main
```

Global variables (defined in `group_vars/all.yml`) use a flat namespace but must still be descriptive:

```yaml
org_name: acme
environment: production
region: us-east-1
```

## Tasks

Task names must be complete sentences that describe the outcome, not the action:

```yaml
# Good
- name: Create the PostgreSQL data directory
- name: Ensure the nginx service is started and enabled
- name: Deploy the application configuration file

# Bad
- name: mkdir
- name: nginx
- name: config
```

## Handlers

Handlers follow the same sentence-style convention and must clearly describe what they trigger:

```yaml
handlers:
  - name: Restart the nginx service
    ansible.builtin.service:
      name: nginx
      state: restarted
```

## Tags

Tags use **kebab-case** and are scoped to intent:

```yaml
tags:
  - install
  - configure
  - tls
  - postgresql-server
```

Avoid overly broad tags like `all` or `setup` that make targeted runs ambiguous.

## Playbooks

Playbook filenames describe their scope in kebab-case:

```
site.yml
deploy-webservers.yml
rotate-tls-certificates.yml
```
