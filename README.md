# CSSECDV Secure Web Project

This repository hosts a SvelteKit project for the CSSECDV machine project. Development commands remain the standard SvelteKit workflow:

```sh
npm run dev        # start dev server
npm run build      # production build
npm run preview    # preview the production build
```

## Security blueprint

The plan and sample code for authentication, RBAC, validation, logging, and demo steps are documented in [`docs/security-plan.md`](docs/security-plan.md). Use it as the reference for implementing the course checklist.

## Quick start

- Install dependencies with `npm install`.
- Run the dev server via `npm run dev -- --host`.
- Default administrator account: `admin@example.com` with password `AdminStrong!1` (change after first login).
