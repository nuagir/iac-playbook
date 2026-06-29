---
sidebar_position: 6
title: Variables & Outputs
---

# Variables & Outputs

Ansible has a complex variable precedence system. Understanding and respecting that system prevents subtle bugs and makes playbooks easier to reason about.

## Variable Precedence

Ansible evaluates variables in the following order (highest precedence last):

| Precedence | Source |
|---|---|
| 1 (lowest) | Role defaults (`roles/<role>/defaults/main.yml`) |
| 2 | Inventory group variables (`group_vars/`) |
| 3 | Inventory host variables (`host_vars/`) |
| 4 | Playbook `vars:` block |
| 5 | Role variables (`roles/<role>/vars/main.yml`) |
| 6 | Task `vars:` |
| 7 | `set_fact` / registered variables |
| 8 (highest) | Extra variables (`-e` / `--extra-vars`) |

Use **role defaults** for values that operators are expected to override. Use **role vars** for internal constants that should not be overridden.

## Defining Defaults

Every role must declare defaults for all variables it uses. This documents the role's interface and prevents undefined variable errors at runtime.

Follow these guidelines when writing defaults:

- **Declare every variable the role uses.** If a task references a variable, it must have a default. Undeclared variables cause hard-to-debug failures when the role is run in a new context.
- **Do not put everything in defaults.** Defaults are for values operators are expected to customize. Internal constants that must not be overridden belong in `vars/main.yml`, where they carry higher precedence and signal that the value is not a public interface.
- **Use safe, functional values.** A default should allow the role to run in a basic environment without modification. Avoid defaults that are environment-specific (e.g. a production hostname) or that would cause harm if applied blindly.
- **Document non-obvious defaults.** Add an inline comment when the chosen value requires context, such as a specific port required by a firewall rule or a timeout tuned for a particular workload.

```yaml
# roles/postgresql_server/defaults/main.yml
postgresql_server_version: "15"
postgresql_server_port: 5432
postgresql_server_max_connections: 100
postgresql_server_data_dir: /var/lib/postgresql/{{ postgresql_server_version }}/main
```

## Group Variables

Organize `group_vars/` to mirror the inventory hierarchy:

```
inventories/production/group_vars/
├── all.yml          # Applies to every host
├── webservers.yml   # Applies to the webservers group
└── databases.yml    # Applies to the databases group
```

Avoid deeply nested YAML in group vars. Flat structures are easier to override and debug.

## Registered Variables

Register task output only when a subsequent task depends on it. Unset registered variables go out of scope at the end of a play:

```yaml
- name: Check if the database is initialized
  ansible.builtin.stat:
    path: /var/lib/postgresql/15/main/PG_VERSION
  register: pg_data_dir

- name: Initialize the database
  ansible.builtin.command: pg_createcluster 15 main
  when: not pg_data_dir.stat.exists
```

## Outputs and Return Values

Ansible does not have native outputs like Terraform. Share data between plays using:

- **`set_fact`** with `cacheable: true` for cross-play variables within a single run.
- **Inventory files or dynamic inventories** for values that must persist across runs.
- **External stores** (e.g. HashiCorp Vault, AWS SSM Parameter Store) for secrets and shared configuration that multiple playbooks consume.

## Variable Typing

Use explicit YAML types to avoid string-vs-boolean ambiguities:

```yaml
# Explicit, unambiguous
postgresql_server_ssl_enabled: true
postgresql_server_port: 5432
postgresql_server_version: "15"   # String, not integer

# Risky: YAML may coerce "yes"/"no" depending on parser version
postgresql_server_ssl_enabled: yes
```

Always quote version numbers and other values that look numeric but must remain strings.
