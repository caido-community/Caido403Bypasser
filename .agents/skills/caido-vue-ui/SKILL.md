---
name: caido-vue-ui
description: UI and component conventions for Caido frontend plugins built with Vue and PrimeVue — component folder structure, `<script setup lang="ts">`, PrimeVue component usage, dark-mode theming with surface colors, Splitter/Card layout patterns, DataTable usage, and Font Awesome icons. Use when creating or editing .vue components or styling the plugin UI.
---

# Caido Vue UI

## Components

1. Use PrimeVue components for all UI components.
2. Use `<script setup lang="ts">` for all components.

### Structure

Use the following layout for every component to keep imports and growth consistent:

```text
ComponentName/
  ├─ index.ts           # Re-export (single public entry)
  ├─ Container.vue      # Main component implementation
  ├─ useForm.ts         # Optional: composable when logic grows (e.g. forms)
  └─ DependentComponent.vue
```

ComponentName/index.ts

```ts
export { default as ComponentName } from "./Container.vue";
```

When a child piece becomes complex or needs its own hook, use the same pattern as the parent:

```text
ComponentName/
  └─ DependentComponent/
       ├─ index.ts
       └─ Container.vue
```

## UI Style Guidelines

### PrimeVue

- Prefer to use PrimeVue components where possible.
- A custom PrimeVue theme is configured with dark mode as default, handling most color-related styles for us.

### General Theme

- Dark Mode is default — all UI elements follow a dark, low-contrast background with light text for high readability.
- For text / background colors, prefer to use `...-surface-...` e.g. `border-surface-700`.
- Caido uses `bg-surface-800` as the main app background, `bg-surface-700` is the background used for `Card` component.
- Follow minimalistic color palette. AVOID using too much colors where possible.

### Layout & Components

- Often use PrimeVue `Splitter` and `SplitterPanel` for vertical or horizontal layout.
- Prefer to use `Card` PrimeVue components a lot, if needed add `h-full` to them via `pt` params.
- Remember to use `<template #content>` and other named slots (like `#header`, `#footer`) in Card and other PrimeVue components that support them.

Example:

```vue
<Card
  class="h-full"
  :pt="{
    body: { class: 'h-full p-0' },
    content: { class: 'h-full flex flex-col' },
  }"
>
  <template #content>
     ...
  </template #content>
</Card>
```

### Environment

- Keep in mind that we are building a plugin that's inside a Caido web app, we can modify frontend by adding sidebar pages using Caido Frontend SDK.
- Our plugin content is rendered within a dedicated window/panel that Caido provides for our sidebar page.
- The plugin UI should integrate seamlessly with Caido's existing interface and theming.

### Data Representation

- Prefer `DataTable` component for displaying structured data:
  * Put an actions column at the end (e.g. "Install" buttons).
- Empty states use friendly, minimal messages with icons.

### Icons

- Always use `fas fa-[...]` for icons. We don't support any other icon libraries.
