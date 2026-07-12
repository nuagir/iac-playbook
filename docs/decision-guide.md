---
sidebar_position: 2
title: Decision Guide
description: An opinionated guide to choosing between Terraform and Ansible, and how to combine them, for a given infrastructure task.
---

# Decision Guide

Terraform and Ansible solve different problems. Reaching for the wrong tool leads to fragile infrastructure, whether that means Ansible playbooks reimplementing a cloud provider's API surface or Terraform provisioners standing in for real configuration management. This guide sets out how to decide which tool owns a given task.

## Core Distinction

| | Terraform | Ansible |
|---|---|---|
| Model | Declarative, state-based | Procedural, task-based (idempotent by convention) |
| Owns | Provisioning cloud and platform resources | Configuring what runs inside those resources |
| Tracks | Persistent state file mapping config to real resources | No state file, re-evaluates target state on every run |
| Best at | Creating, updating, and destroying infrastructure (VPCs, compute instances, databases, IAM, DNS) | Installing packages, managing config files, orchestrating application deploys, running ad hoc operational tasks |

If the task is "does this resource exist with these attributes," use Terraform. If the task is "does this machine have this software running with this configuration," use Ansible.

## Decision Checklist

Ask these questions in order:

1. **Does the task create, modify, or destroy a resource in a cloud or platform provider's API** (EC2 instance, S3 bucket, Kubernetes cluster, DNS record, IAM role)? Use Terraform.
2. **Does the task change the state of an already-provisioned machine or service** (installing packages, templating config files, restarting a service, rotating an application secret)? Use Ansible.
3. **Does the task need to run once per resource lifecycle, and is it tightly coupled to that resource's creation** (bootstrapping a VM at first boot)? Prefer cloud-init or a provider-native mechanism over a Terraform provisioner. Provisioners are a last resort, see [Terraform Modules](./terraform/modules).
4. **Does the task span both** (provision a fleet of VMs, then configure them)? Split it: Terraform provisions and outputs an inventory (IPs, tags, hostnames), Ansible consumes that inventory to configure. Do not use Terraform provisioners to invoke Ansible directly; keep the two tools decoupled so each can be run, tested, and rolled back independently.

## When to Use Terraform

- Standing up or tearing down cloud infrastructure: networking, compute, storage, managed databases, load balancers.
- Anything that must be tracked as state and reconciled on every plan, so drift is visible and reviewable before it's applied.
- Multi-cloud or multi-account provisioning where resource dependencies need to be expressed declaratively.
- IAM, security groups, and other access-control resources, where an auditable plan/apply history matters.

See the [Terraform section](./terraform) for naming conventions, module structure, and state management.

## When to Use Ansible

- Configuring software on servers: package installation, service management, user accounts, file templating.
- Orchestrating rolling deploys or maintenance tasks across a fleet, where you need control over batching and ordering.
- One-off or ad hoc operational tasks (patching, restarting a service across hosts) that don't belong in a declarative state file.
- Environments with long-lived, mutable servers where full immutability via re-provisioning isn't practical.

See the [Ansible section](./ansible) for project structure, naming conventions, and anti-patterns.

## Using Them Together

The common and recommended pattern:

1. Terraform provisions infrastructure and writes a [dynamic inventory](https://docs.ansible.com/ansible/latest/plugins/inventory.html) or an output file consumed by Ansible (e.g. instance IPs tagged by role).
2. Ansible reads that inventory and configures the provisioned hosts.
3. The two run as separate pipeline stages, Terraform apply first, Ansible playbook run second, so each has its own review, approval, and rollback path. See [CI/CD Pipeline](./terraform/cicd-pipeline) and [Ansible CI/CD Pipeline](./ansible/cicd-pipeline).

Avoid:

- Calling `ansible-playbook` from a Terraform `local-exec` or `remote-exec` provisioner. This couples an idempotent, replayable Ansible run to a one-shot Terraform apply, and failures are much harder to retry safely.
- Managing the same resource attribute from both tools (e.g. Terraform setting an instance tag that an Ansible playbook also templates). Pick one owner per attribute.
- Using Ansible to create cloud resources it can technically reach via API modules when Terraform's state tracking would give you drift detection and a reviewable plan instead.

## Guiding Principles

- **One tool, one layer:** Terraform owns infrastructure, Ansible owns configuration. A resource or setting should have exactly one owner.
- **Decouple the handoff:** connect the two through an inventory or output artifact, not a direct invocation from one tool to the other.
- **State drives infrastructure, idempotency drives configuration:** don't try to make Ansible track state like Terraform, and don't try to make Terraform manage in-place configuration like Ansible.
- **When in doubt, provision less, configure more:** it's easier to extend a playbook than to unwind infrastructure managed outside of Terraform state.
