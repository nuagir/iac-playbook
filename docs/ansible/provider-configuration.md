---
sidebar_position: 7
title: Provider Configuration
---

# Provider Configuration

Ansible connects to managed nodes and cloud APIs through a combination of inventory configuration, connection plugins, and collection-specific settings. This page covers the canonical way to configure each.

## SSH Connection

SSH is the default connection method for Linux and macOS hosts. Configure it in `ansible.cfg` and inventory. Never pass connection parameters as CLI flags in CI.

```ini
# ansible.cfg
[defaults]
remote_user = ansible

[ssh_connection]
ssh_args        = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=accept-new
pipelining      = true
transfer_method = smart
```

Enabling `pipelining` reduces the number of SSH connections per task and significantly improves performance. It requires that `requiretty` is disabled in `/etc/sudoers` on managed hosts.

### Bastion / Jump Host

For hosts reachable only through a bastion, set the `ansible_ssh_common_args` variable at the group level:

```yaml
# inventories/production/group_vars/all.yml
ansible_ssh_common_args: >-
  -o ProxyJump=bastion.example.com
  -o StrictHostKeyChecking=accept-new
```

## WinRM (Windows Hosts)

For Windows hosts, use the `winrm` connection plugin provided by `ansible.windows`:

```yaml
# host_vars/win-host-01.yml
ansible_connection: winrm
ansible_winrm_transport: kerberos
ansible_winrm_server_cert_validation: validate
ansible_port: 5986
```

Never use `ansible_winrm_server_cert_validation: ignore` outside of a lab environment.

## Local Connection

Use `connection: local` only for tasks that run on the control node itself, such as invoking a cloud API or generating a local file:

```yaml
- name: Generate the Terraform backend configuration
  ansible.builtin.template:
    src: backend.tf.j2
    dest: "{{ playbook_dir }}/backend.tf"
  connection: local
  delegate_to: localhost
```

## Cloud Provider Configuration

### AWS

Install and pin the AWS collection:

```yaml
# collections/requirements.yml
collections:
  - name: amazon.aws
    version: ">=7.0.0,<8.0.0"
```

Authenticate using IAM roles attached to the control node (EC2 instance profile or ECS task role). Never hardcode access keys in variables or environment files.

```yaml
# Correct: relies on instance profile / environment credentials
- name: List S3 buckets
  amazon.aws.s3_bucket_info:
    region: us-east-1
  register: s3_buckets
```

If running outside AWS (e.g. a local developer machine or GitHub Actions), use short-lived credentials obtained via `aws sts assume-role` and injected as environment variables by the CI pipeline. Store the role ARN in a non-secret CI variable; never store the resulting credentials beyond the lifetime of the job.

### Azure

```yaml
# collections/requirements.yml
collections:
  - name: azure.azcollection
    version: ">=2.0.0,<3.0.0"
```

Authenticate with a service principal whose credentials are retrieved from a secrets manager at runtime:

```yaml
- name: Read the Azure service principal credentials
  community.hashi_vault.vault_kv2_get:
    path: secret/azure/sp
  register: azure_sp
  no_log: true

- name: Create the resource group
  azure.azcollection.azure_rm_resourcegroup:
    name: myapp-production-rg
    location: eastus
    subscription_id: "{{ azure_sp.data.data.subscription_id }}"
    client_id: "{{ azure_sp.data.data.client_id }}"
    secret: "{{ azure_sp.data.data.client_secret }}"
    tenant: "{{ azure_sp.data.data.tenant_id }}"
  no_log: true
```

### GCP

```yaml
# collections/requirements.yml
collections:
  - name: google.cloud
    version: ">=1.3.0,<2.0.0"
```

Prefer Workload Identity Federation over service account JSON keys. When a key file is unavoidable, retrieve it from a secrets manager and write it to a temporary file with `ansible.builtin.tempfile`, then delete it in an `always:` block:

```yaml
- name: Write the GCP service account key to a temp file
  ansible.builtin.tempfile:
    suffix: .json
  register: gcp_key_file
  no_log: true

- name: Populate the GCP key file
  ansible.builtin.copy:
    content: "{{ gcp_sa_key }}"
    dest: "{{ gcp_key_file.path }}"
    mode: "0600"
  no_log: true

- name: Perform GCP tasks
  google.cloud.gcp_compute_instance_info:
    project: myproject
    zone: us-central1-a
    auth_kind: serviceaccount
    service_account_file: "{{ gcp_key_file.path }}"
  register: gcp_instances

- name: Remove the GCP key file
  ansible.builtin.file:
    path: "{{ gcp_key_file.path }}"
    state: absent
  when: gcp_key_file.path is defined
```

## Inventory Plugins

Prefer dynamic inventories over static `hosts.yml` files for cloud environments. Pin the plugin version alongside the collection:

```yaml
# inventories/production/hosts.aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
filters:
  tag:Environment: production
keyed_groups:
  - key: tags.Role
    prefix: role
compose:
  ansible_host: public_ip_address
```

Run `ansible-inventory --list` to validate the dynamic inventory before a playbook run.
