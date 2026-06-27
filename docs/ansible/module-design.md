---
sidebar_position: 4
title: Module Design
---

# Module Design

Modules are the building blocks of Ansible automation. Following consistent guidelines for writing and consuming modules keeps playbooks readable and maintainable.

## Prefer Built-in Modules

Always prefer Ansible built-in or `ansible.builtin.*` modules over shell commands. Built-in modules are idempotent, cross-platform, and return structured data.

```yaml
# Good
- name: Create the application user
  ansible.builtin.user:
    name: appuser
    shell: /bin/bash
    state: present

# Bad — not idempotent, no structured output
- name: Create the application user
  ansible.builtin.command: useradd appuser
```

## Use Fully Qualified Collection Names (FQCN)

Always use the full FQCN for every module call. This prevents ambiguity when multiple collections provide modules with the same short name.

```yaml
# Good
ansible.builtin.copy:
ansible.builtin.template:
community.general.ufw:

# Bad
copy:
template:
ufw:
```

## Module Argument Style

Pass module arguments as YAML keys, not as a single `args:` string:

```yaml
# Good
- name: Set file permissions on the config file
  ansible.builtin.file:
    path: /etc/myapp/config.yml
    owner: myapp
    group: myapp
    mode: "0640"

# Bad
- name: Set file permissions on the config file
  ansible.builtin.file: path=/etc/myapp/config.yml owner=myapp group=myapp mode=0640
```

## Consuming Collection Modules

Declare all required collections in `collections/requirements.yml`:

```yaml
collections:
  - name: community.general
    version: ">=8.0.0,<9.0.0"
  - name: ansible.posix
    version: ">=1.5.0"
```

Pin to a version range to prevent unexpected breaking changes while still allowing patch releases.

## Writing Custom Modules

When no existing module meets a need, write a custom module rather than shelling out. Custom modules must:

- Live in `library/` at the repository root or within the role's `library/` directory.
- Be written in Python and use `AnsibleModule` for argument handling.
- Return a `changed` boolean and a `diff` structure where applicable.
- Include a `DOCUMENTATION`, `EXAMPLES`, and `RETURN` docstring block.
- Be idempotent — running the module twice with the same arguments must not alter state on the second run.

```python
from ansible.module_utils.basic import AnsibleModule

def run_module():
    module_args = dict(
        name=dict(type="str", required=True),
        state=dict(type="str", default="present", choices=["present", "absent"]),
    )
    module = AnsibleModule(argument_spec=module_args, supports_check_mode=True)
    # ... implementation
    module.exit_json(changed=False, name=module.params["name"])

if __name__ == "__main__":
    run_module()
```
