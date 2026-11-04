# VueJS Frontend Template

This template should be used as a starting point for creating a new plugin with a VueJS frontend.

## Features

- [mise](https://mise.jdx.dev/) to manage the Node.js and pnpm toolchain
- [pnpm](https://pnpm.io/) as package manager
- [TypeScript](https://www.typescriptlang.org/)
- [VueJS](https://vuejs.org/)
- [PrimeVue](https://primevue.org/) for UI components

## Getting Started

The Node.js and pnpm versions are pinned in [`mise.toml`](./mise.toml). We recommend [mise](https://mise.jdx.dev/) to manage them. Trust this directory's config once, install the toolchain, then build:

```bash
mise trust     # required once: mise won't load an untrusted mise.toml
mise install   # installs the pinned Node.js and pnpm
pnpm install
pnpm build
```

CI uses the same `mise.toml`, so your local and CI toolchains stay in sync.
