---
sidebar_position: 4
title: Modules
---

# Modules

- Prefer small, single-purpose modules over large all-in-one modules.
- Use versioned module references in production root modules (Git tag or registry version).
- Never call a module from inside another module more than one level deep. Keep the module graph shallow.
- Pass only what a module needs. Avoid forwarding the entire `var.*` scope.
