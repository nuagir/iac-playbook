---
sidebar_position: 5
title: State Management
---

# State Management

Unlike Terraform, Ansible does not maintain a state file. Correctness depends on idempotent task design and understanding how Ansible determines whether a change is needed.

## Idempotency

Every task must be safe to run multiple times. If the desired state is already present, the task must report `changed: false` and make no modifications.

```yaml
# Idempotent: ansible.builtin.package checks installed state
- name: Install the nginx package
  ansible.builtin.package:
    name: nginx
    state: present

# Not idempotent: runs every time regardless of current state
- name: Install nginx
  ansible.builtin.command: apt-get install -y nginx
```

When `ansible.builtin.command` or `ansible.builtin.shell` is unavoidable, use `creates` or `removes` to guard execution:

```yaml
- name: Extract the application archive
  ansible.builtin.command:
    cmd: tar -xzf /tmp/app.tar.gz -C /opt/app
    creates: /opt/app/bin/app
```

## Check Mode

All playbooks must be compatible with `--check` mode. Use `check_mode: false` sparingly and only on tasks that are genuinely safe to execute without changes (e.g. read-only data gathering).

```bash
ansible-playbook playbooks/site.yml --check --diff
```

The `--diff` flag shows file changes in context, making check mode runs useful for code review and change approval.

## Drift Detection

Because Ansible has no native drift detection, schedule periodic runs in read-only (`--check`) mode via CI to surface configuration drift between deployments.

## Handlers and Notify

Use handlers to trigger service restarts or reloads only when a task actually changes state:

```yaml
tasks:
  - name: Deploy the nginx configuration
    ansible.builtin.template:
      src: nginx.conf.j2
      dest: /etc/nginx/nginx.conf
    notify: Restart the nginx service

handlers:
  - name: Restart the nginx service
    ansible.builtin.service:
      name: nginx
      state: restarted
```

Handlers run once at the end of a play, even if notified multiple times. Use `ansible.builtin.meta: flush_handlers` to force immediate execution when a subsequent task depends on the restarted service.

## Facts and Caching

Ansible facts describe the current state of managed hosts. Cache facts to speed up subsequent runs and reduce load on managed nodes:

```ini
# ansible.cfg
[defaults]
fact_caching            = jsonfile
fact_caching_connection = .cache/facts
fact_caching_timeout    = 3600
```

Invalidate the cache after significant host changes by deleting the cache directory or running with `--flush-cache`.
