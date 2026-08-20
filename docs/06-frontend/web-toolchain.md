# Web Toolchain

> **Status:** Written
> **Owner step:** Step 3 — Architecture ([ADR-0010](../12-adr/0010-web-stack.md))
> **Last updated:** 2026-08-20
> **Informs:** [tenant-web.md](tenant-web.md), and every web surface that follows

The versions the web surfaces build against, and why two of them are **not** the newest published.

Companion to [flutter-toolchain.md](flutter-toolchain.md), which pins the mobile side for a different reason: there, the machine's Flutter is deliberately old. Here, everything is current except where the ecosystem has not caught up.

---

## Pinned

| | Version | Notes |
|---|---|---|
| Node | **24.19.0 LTS** ("Krypton") | Installed via nvm. `.nvmrc` and `engines` both pin it |
| Next.js | **16.3.1** | Latest. App Router, Turbopack |
| React | **19.2.8** | Latest |
| Tailwind CSS | **4.3.3** | Latest. v4 is CSS-first — theme tokens live in `app/globals.css`, not a JS config |
| shadcn/ui | **CLI 4.18.0**, radix base | Components are copied into the repo, not depended on |
| TypeScript | **5.9.3** | **Not the newest.** See below |
| ESLint | **9.39.5** | **Not the newest.** See below |

### Node was the real problem

The machine had **v23.10.0** — an odd-numbered line that reached end of life and stopped receiving security patches. Next 16 tolerates it (`engines: node >= 20.9.0`), so nothing would have complained until something did.

Replaced with **24.19.0 LTS** via nvm, set as the default. `.nvmrc` pins it for the repo; `engines` in `package.json` makes a wrong Node loud rather than silent.

### Why TypeScript is 5.9.3 and not 7.0.2

TypeScript 7 is published and **builds fine with Next 16** — verified, clean `tsc --noEmit`, clean production build.

It also kills linting outright:

```
Error: typescript-eslint does not support TS 7.0.
```

The newest `typescript-eslint` (8.67.0, bundled by `eslint-config-next`) declares `typescript: ">=4.8.4 <6.1.0"`. There is no released version that supports TS 7, so the choice is real:

| | TS 7.0.2 | TS 5.9.3 |
|---|---|---|
| Next 16 build | Works | Works |
| Type checking | Works | Works |
| **Linting** | **Dead** | Works |

Working lint on a product codebase beats being early on a compiler major. **Revisit as soon as `typescript-eslint` ships TS 7 support** — the upgrade is a one-line change and a lint run.

### Why ESLint is 9 and not 10

ESLint 10.8.1 is published, and `eslint-config-next` even permits it by range. It then crashes inside `eslint-plugin-react`:

```
at usedPropTypesInstructions (eslint-plugin-react/lib/util/usedPropTypes.js:307)
```

A peer range being satisfied is not the same as the plugin working. Pinned to 9.x until the Next config's bundled plugins support 10.

---

## The rule this establishes

**"Latest" means the latest version the whole toolchain supports, not the latest version published.**

Both exceptions above were found by actually running `lint`, `typecheck`, and `build` after each bump — not by reading version numbers. Upgrades move one package at a time, with those three commands between each, because bulk upgrades turn several separate breakages into one unreadable one.

## Verifying an environment

```bash
node --version   # v24.19.0
npm run typecheck && npm run lint && npm run build
```

Clean on all three is the gate before any commit touching a web app.
