---
sidebar_position: 1
title: Overview
---

# Ansible

This section documents our opinionated approach to writing, organizing, and operating Ansible code. It covers naming conventions, structural guidelines, state management, and everyday best practices that every engineer working on infrastructure automation should follow.

## Sections

| Section | Description |
|---|---|
| [Project Structure](./project-structure) | Repository layout and directory organization |
| [Naming Conventions](./naming-conventions) | Standardized role, task, and variable naming patterns |
| [Module Design](./module-design) | Guidelines for writing and consuming Ansible modules |
| [State Management](./state-management) | Idempotency principles and state tracking strategies |
| [Variables & Outputs](./variables-and-outputs) | Variable precedence, typing, and output conventions |
| [Provider Configuration](./provider-configuration) | SSH, WinRM, and cloud provider authentication setup |
| [Anti-Patterns](./anti-patterns) | Common mistakes and how to avoid them |
| [CI/CD Pipeline](./cicd-pipeline) | Workflow rules, linting, testing, and pipeline setup |
| [Security & Compliance](./security-and-compliance) | Secrets handling, privilege escalation, and hardening |

## Guiding Principles

- **Consistency Over Preference:** Follow the patterns in this playbook even when you disagree. Raise a discussion to change the standard instead of diverging silently.
- **Idempotency Always:** Every task must be safe to run multiple times without changing the outcome after the first successful run.
- **Least Privilege By Default:** Use `become` only where strictly necessary. Prefer targeted privilege escalation over broad `sudo` access.
- **Code Review Everything:** No playbook runs directly against production from a developer machine. All changes go through CI/CD.
