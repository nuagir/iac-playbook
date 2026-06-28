---
sidebar_position: 8
title: Anti-Patterns
---

# Anti-Patterns

The following patterns are banned in this codebase. Each one introduces fragility, security risk, or maintenance burden that outweighs any short-term convenience.

## Shelling Out Instead of Using Modules

**Problem:** `ansible.builtin.shell` and `ansible.builtin.command` bypass idempotency guarantees and structured error handling.

**Fix:** Use a purpose-built module. If none exists, write a custom module.

```yaml
# Bad
- name: Create the application directory
  ansible.builtin.shell: mkdir -p /opt/myapp

# Good
- name: Create the application directory
  ansible.builtin.file:
    path: /opt/myapp
    state: directory
    mode: "0755"
```

## Hardcoding Secrets in Variables or Templates

**Problem:** Secrets checked into source control are compromised, even in private repositories.

**Fix:** Retrieve secrets at runtime from a secrets manager (Vault, AWS Secrets Manager) or use `ansible-vault` for encrypted variable files.

```yaml
# Bad
db_password: supersecret123

# Good — retrieved at runtime
- name: Read the database password from Vault
  community.hashi_vault.vault_kv2_get:
    path: secret/myapp/database
  register: vault_secret
```

## Global `become: true` at the Play Level

**Problem:** Elevating every task to root increases the blast radius of errors and violates least-privilege principles.

**Fix:** Set `become: false` globally in `ansible.cfg` and enable `become` only on tasks that require it.

```yaml
# Bad
- hosts: webservers
  become: true
  tasks:
    - name: Read the application config   # Does not need root
      ...

# Good
- hosts: webservers
  tasks:
    - name: Install the nginx package
      ansible.builtin.package:
        name: nginx
        state: present
      become: true

    - name: Read the application config   # No become needed
      ansible.builtin.slurp:
        src: /etc/myapp/config.yml
```

## Ignoring Errors Silently

**Problem:** `ignore_errors: true` hides real failures and allows playbooks to continue in a broken state.

**Fix:** Handle errors explicitly with `failed_when`, `rescue` blocks, or `block`/`rescue`/`always` structures.

```yaml
# Bad
- name: Stop the old service
  ansible.builtin.service:
    name: old-service
    state: stopped
  ignore_errors: true

# Good
- name: Stop the old service
  ansible.builtin.service:
    name: old-service
    state: stopped
  failed_when: false   # Only when the service may legitimately not exist
  register: stop_result

- name: Log that the old service was not found
  ansible.builtin.debug:
    msg: "old-service was not running; skipping"
  when: stop_result.failed
```

## Using `latest` for Package Versions

**Problem:** `state: latest` introduces uncontrolled upgrades that can break services during routine playbook runs.

**Fix:** Pin to a specific version or use `state: present` for a predictable install.

```yaml
# Bad
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: latest

# Good
- name: Install nginx
  ansible.builtin.package:
    name: nginx=1.24.*
    state: present
```

## Monolithic Playbooks

**Problem:** Large, single-file playbooks are hard to test, reuse, and maintain.

**Fix:** Extract logic into roles. Playbooks should be thin wrappers that import roles and set host targets.
