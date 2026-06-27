---
sidebar_position: 2
title: Project Structure
---

# Project Structure

A consistent directory layout makes repositories predictable and reduces onboarding friction. All Ansible projects must follow the structure below.

## Repository Layout

```
.
├── inventories/
│   ├── production/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   │       └── all.yml
│   └── staging/
│       ├── hosts.yml
│       └── group_vars/
│           └── all.yml
├── roles/
│   └── <role-name>/
│       ├── defaults/
│       │   └── main.yml
│       ├── files/
│       ├── handlers/
│       │   └── main.yml
│       ├── meta/
│       │   └── main.yml
│       ├── tasks/
│       │   └── main.yml
│       ├── templates/
│       ├── tests/
│       │   ├── inventory
│       │   └── test.yml
│       └── vars/
│           └── main.yml
├── playbooks/
│   ├── site.yml
│   └── <service>.yml
├── collections/
│   └── requirements.yml
├── ansible.cfg
└── requirements.txt
```

## Key Directories

### `inventories/`

Split inventories by environment. Each environment directory contains a `hosts.yml` inventory file and a `group_vars/` directory for environment-specific variable overrides. Never share a single inventory across environments.

### `roles/`

All reusable automation lives in roles. Each role follows the standard Ansible role directory structure. Roles are self-contained — they must not rely on variables defined outside their own `defaults/` or `vars/` directories unless those variables are explicitly documented in `meta/main.yml`.

### `playbooks/`

Playbooks are thin orchestration layers. They import roles and set host targets. Business logic belongs in roles, not playbooks.

### `collections/`

Pin all collection dependencies in `collections/requirements.yml`. Install with:

```bash
ansible-galaxy collection install -r collections/requirements.yml
```

## `ansible.cfg`

Every repository must include an `ansible.cfg` at the root. At minimum:

```ini
[defaults]
inventory          = inventories/
roles_path         = roles/
collections_paths  = ~/.ansible/collections
stdout_callback    = yaml
interpreter_python = auto_silent

[privilege_escalation]
become      = false
become_method = sudo
```

Setting `become = false` at the global level forces explicit opt-in per play or per task.
