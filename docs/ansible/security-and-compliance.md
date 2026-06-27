---
sidebar_position: 9
title: Security & Compliance
---

# Security & Compliance

Security is not optional. Every Ansible project must follow the controls below from day one.

## Secrets Management

Never store plaintext secrets in:

- Variable files (`group_vars/`, `host_vars/`, role `vars/` or `defaults/`)
- Playbook `vars:` blocks
- Inventory files
- Templates

### Ansible Vault

Use `ansible-vault` to encrypt secret variable files at rest:

```bash
# Encrypt a variable file
ansible-vault encrypt inventories/production/group_vars/all/vault.yml

# Edit an encrypted file
ansible-vault edit inventories/production/group_vars/all/vault.yml
```

Name encrypted files `vault.yml` and keep plaintext variable files as `vars.yml` in the same directory. Reference vault variables in `vars.yml` using the `vault_` prefix convention:

```yaml
# vars.yml
db_password: "{{ vault_db_password }}"

# vault.yml (encrypted)
vault_db_password: supersecret123
```

### External Secrets Managers

For secrets that multiple systems consume, retrieve them at runtime:

```yaml
- name: Read the database credentials from AWS Secrets Manager
  community.aws.aws_secret:
    name: myapp/production/db
    region: us-east-1
  register: db_secret
  no_log: true
```

Always set `no_log: true` on tasks that handle secret data to prevent values from appearing in logs.

## Privilege Escalation

- Set `become: false` globally in `ansible.cfg`.
- Enable `become: true` only on individual tasks that require it.
- Never use `become_user: root` when a less-privileged user suffices.
- Log all privilege escalations. Configure `syslog` on managed hosts to capture `sudo` events.

## SSH Hardening

- Use SSH key authentication exclusively. Password authentication must be disabled on all managed hosts.
- Rotate SSH keys on a schedule. Store private keys in a secrets manager, not on developer machines.
- Restrict the Ansible control node's SSH access to a dedicated bastion host or VPN.

## `no_log` Usage

Set `no_log: true` on any task that:

- Reads a secret from a variable or external store.
- Writes a secret to a file or configuration.
- Passes a secret as a command-line argument.

```yaml
- name: Set the application database password
  ansible.builtin.lineinfile:
    path: /etc/myapp/config.ini
    regexp: "^DB_PASSWORD="
    line: "DB_PASSWORD={{ db_password }}"
  no_log: true
```

## Compliance Scanning

Run a CIS benchmark scan as the final step of the CI pipeline for any role that configures OS-level settings:

```bash
ansible-playbook playbooks/cis-scan.yml \
  -i inventories/staging/hosts.yml \
  --tags cis-level1
```

Fail the pipeline if the scan score drops below the agreed threshold. Track deviations in a risk register with owner, mitigation, and review date.

## Audit Logging

Enable Ansible callback plugins that write structured audit logs:

```ini
# ansible.cfg
[defaults]
callback_whitelist = ansible.posix.json, ansible.posix.timer
```

Ship these logs to the centralized SIEM for retention and alerting. Retain logs for a minimum of 90 days.
