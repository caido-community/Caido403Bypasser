---
name: caido-plugin-development
description: Guidance for building Caido plugins — what Caido is, the backend/frontend/shared monorepo structure, the typed plugin contract (Spec via @caido/sdk-shared, the shared API and Events types, Result/ok/err), Backend SDK patterns (registering API endpoints, init, events), external callers of the backend API via @caido/sdk-client, Frontend SDK patterns (mounting a page with navigation.addPage, sidebar items, commands, menus, sending HTTP requests), findings, code-quality and naming conventions, the linter, and SDK API validation. Use whenever writing or editing code in a Caido plugin (anything under packages/backend, packages/frontend, or packages/shared, or caido.config.ts).
---

# Caido Plugin Development

## What is Caido

Caido is a lightweight web application security auditing toolkit designed to help security professionals audit web applications with efficiency and ease.

Key features include:
- HTTP proxy for intercepting and viewing requests in real-time
- Replay functionality for resending and modifying requests to test endpoints
- Automate feature for testing requests against wordlists
- Match & Replace for automatically modifying requests with regex rules
- HTTPQL query language for filtering through HTTP traffic
- Workflow system for creating custom encoders/decoders and plugins
- Project management for organizing different security assessments

## Environment

We are running in a plugin environment where we interact with Caido through the Caido Backend or Frontend SDK.

### Plugin Structure

Modern Caido plugins are pnpm monorepos with up to three packages:

- `packages/shared` → Shared, framework-agnostic code: the typed plugin contract (API + Events), the `Result` type, and data schemas/types. Imported by BOTH backend and frontend as `shared` (a workspace alias for the real package name, `@caido-community/<plugin-id>`).
- `packages/backend` → Backend plugin code: server-side logic, data processing, and the API endpoint implementations.
- `packages/frontend` → Frontend plugin code: UI components, user interactions, and calls to the backend.

A plugin needs at least one of backend/frontend. `shared` is what keeps the two sides type-safe against each other.

### Plugin Development

Plugins are described by a `caido.config.ts` file that declares each sub-plugin (`kind: "backend" | "frontend"`, its `id`, and `root`), and the frontend's `backend: { id }` link. They are packaged together as a single installable plugin.

### Key Development Concepts

- The `shared` package defines the contract; backend implements it; frontend calls it. Communication is typed end-to-end.
- Frontend plugins create pages, UI components, and handle user interactions.
- Backend plugins register API endpoints (and can emit events) that the frontend consumes.

## Toolchain (mise)

This plugin pins its Node.js and pnpm versions with [mise](https://mise.jdx.dev/) in `mise.toml` at the repo root. **Use mise** so you build and run with the exact toolchain CI uses — don't rely on a globally-installed Node/pnpm:

- Install the pinned tools once with `mise install`.
- Run package scripts through the mise-managed toolchain. Either activate mise in your shell (so `pnpm ...` resolves to the pinned version) or prefix commands with `mise exec --`, e.g. `mise exec -- pnpm install`, `mise exec -- pnpm build`.
- `mise.toml` is the single source of truth for tool versions — CI reads it too (via `jdx/mise-action`). If a version needs to change, edit `mise.toml`; don't hardcode versions elsewhere.

Package scripts (run with pnpm under the mise toolchain): `build`, `watch`, `typecheck`, `lint`, `knip`.

## Plugin API Contract (the `shared` package)

The contract lives in `shared` and is consumed by both sides. The current SDK builds it from `@caido/sdk-shared`'s `DefinePluginPackageSpec`.

`shared/src/result.ts` — the Result type and helpers used everywhere errors can occur:

```typescript
export type Result<T> =
  | { kind: "Ok"; value: T }
  | { kind: "Error"; error: string };

export function ok<T>(value: T): Result<T> {
  return { kind: "Ok", value };
}

export function err<T>(error: string): Result<T> {
  return { kind: "Error", error };
}
```

`shared/src/api.ts` — the API type. IMPORTANT: these signatures are the **frontend-facing** call shapes and do NOT include the `sdk` parameter. The backend implementations take `sdk` as their first argument; `sdk.api.register` bridges the two.

```typescript
import type { Result } from "./result";

export type API = {
  getConfig: () => Result<Config>;
  updateConfig: (updates: UpdateConfig) => Promise<Result<Config>>;
  createSession: (providerId?: string) => Promise<Result<Session>>;
};
```

`shared/src/events.ts` — optional events the backend can emit to the frontend, as a map of name → payload callback:

```typescript
export type Events = {
  "session:created": (session: Session) => void;
  "config:updated": (config: Config) => void;
};
```

`shared/src/index.ts` — assemble the `Spec` and re-export the public API:

```typescript
import type { DefinePluginPackageSpec } from "@caido/sdk-shared";

import type { API } from "./api";
import type { Events } from "./events";

export { type Result, ok, err } from "./result";
export type { API } from "./api";
export type { Events } from "./events";

export type Spec = DefinePluginPackageSpec<{
  manifestId: "my-plugin"; // must match the plugin id in caido.config.ts
  api: API;
  events: Events;
}>;
```

> Older plugins instead use `DefineAPI<{ fn: typeof fn }>` and `DefineEvents<{...}>` imported directly from `caido:plugin`, with `SDK<API, BackendEvents>` / `Caido<API, BackendEvents>`. Prefer the `shared` + `Spec` approach above for new code.

### The backend API is public (`@caido/sdk-client`)

Your frontend is not the only caller. Any script, CLI, or other tool can call the backend API and subscribe to its events through a Caido instance using `@caido/sdk-client` (from `caido/sdk-js`). For that reason the `shared` package is named `@caido-community/<plugin-id>`, so it can be published to npm and external callers get types from the `Spec`:

```typescript
import { Client } from "@caido/sdk-client";
import type { Spec } from "@caido-community/quickssrf";

const client = new Client({ url: "http://localhost:8080", auth: { pat } });
await client.connect();

const plugin = await client.plugin.pluginPackage<Spec>("quickssrf");
const providers = await plugin?.getProviders(); // typed from Spec["api"]

for await (const [event] of plugin!.subscribeEvent("interaction:received")) {
  // typed from Spec["events"]
}
```

Keep this in mind when changing `api` or `events`: callers outside your frontend may depend on them, and values cross the wire as JSON.

## Backend SDK

The backend implements the API and is typed with `SDK<Spec>`.

### Backend Architecture

Use a clean, layered backend architecture:

- Organize code into `api`, `services`, `repositories`, `stores`, and `utils`.
- Keep filenames short and contextual. Inside `api/`, use `sessions.ts`, not `sessions-api.ts`.
- Add `index.ts` barrels that re-export production modules.
- Keep dependencies one-way: API → services → repositories/stores/adapters.
- APIs validate and map results; services own workflows; repositories own persistence; stores hold process-local state.
- Prefer dependency injection over module-level globals and getter-based initialization.
- Prefer discriminated unions with a `kind` field for runtime states.

`backend/src/types.ts`:

```typescript
import type { SDK } from "caido:plugin";
import type { Spec } from "shared";

export type BackendSDK = SDK<Spec>;
```

`backend/src/index.ts` — `init` registers the endpoints (it may be `async` to do setup) and can subscribe to lifecycle events:

```typescript
import type { SDK } from "caido:plugin";
import type { Spec } from "shared";

import { getConfig, updateConfig } from "./api";

export async function init(sdk: SDK<Spec>) {
  sdk.api.register("getConfig", getConfig);
  sdk.api.register("updateConfig", updateConfig);

  sdk.events.onProjectChange(async () => {
    // re-initialize per-project state when the user switches projects
  });
}
```

API implementations take `sdk` as the FIRST argument (even though the `shared` API type omits it) and return a `Result`. Prefer `Result` over throwing so the frontend can handle errors without try/catch:

```typescript
import type { SDK } from "caido:plugin";
import type { Config, Result, UpdateConfig } from "shared";
import { err, ok } from "shared";

export function getConfig(_sdk: SDK): Result<Config> {
  return ok(configStore.getConfig());
}

export async function updateConfig(
  sdk: SDK,
  updates: UpdateConfig,
): Promise<Result<Config>> {
  try {
    await configStore.updateConfig(updates);
    return ok(configStore.getConfig());
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
```

## Frontend SDK

The frontend is typed with `Caido<Spec>` (a single type parameter — the `Spec` carries both the API and the events).

`frontend/src/types.ts`:

```typescript
import type { Caido } from "@caido/sdk-frontend";
import type { Spec } from "shared";

export type FrontendSDK = Caido<Spec>;
```

`frontend/src/index.ts` — build your UI, mount it onto a root element, then register the page with `navigation.addPage` and add a sidebar entry pointing at the same path:

```typescript
import { type FrontendSDK } from "./types";

export const init = (sdk: FrontendSDK) => {
  // Build your UI (e.g. a Vue app) and mount it onto a root element.
  const root = document.createElement("div");
  Object.assign(root.style, { height: "100%", width: "100%" });
  // app.mount(root) ...

  // Register the page, then point a sidebar item at the same path.
  sdk.navigation.addPage("/my-plugin", { body: root });
  sdk.sidebar.registerItem("My Plugin", "/my-plugin", {
    icon: "fas fa-rocket",
  });
};
```

### Calling the Backend

Backend endpoints are available on `sdk.backend`, typed from the API. Handle the `Result` — no try/catch needed:

```typescript
const result = await sdk.backend.updateConfig(updates);

if (result.kind === "Error") {
  sdk.window.showToast(result.error, { variant: "error" });
  return;
}

const config = result.value;
sdk.window.showToast("Saved", { variant: "success" });
```

### Command Pattern

Commands provide a unified way to register actions triggered from:
- Command palette (Ctrl/Cmd+Shift+P)
- Context menus (right-click)
- UI buttons
- Keyboard shortcuts

Commands are a frontend-only concept.

```typescript
const Commands = {
  generateUrl: "my-plugin.generate-url",
} as const;

sdk.commands.register(Commands.generateUrl, {
  name: "Generate OAST URL",
  run: async () => {
    const result = await sdk.backend.createSession();
    if (result.kind === "Ok") {
      await navigator.clipboard.writeText(result.value.url);
      sdk.window.showToast("URL copied", { variant: "success" });
    } else {
      sdk.window.showToast(result.error, { variant: "error" });
    }
  },
  group: "My Plugin",
});

// Add to the command palette
sdk.commandPalette.register(Commands.generateUrl);

// Add to a context menu (type is the surface, e.g. "Request" or "RequestRow")
sdk.menu.registerItem({
  type: "Request",
  commandId: Commands.generateUrl,
  leadingIcon: "fas fa-cog",
});
```

### Working with Requests and Responses

```typescript
import { RequestSpec } from "caido:utils";

const spec = new RequestSpec("https://api.example.com/data");
spec.setMethod("POST");
spec.setHeader("Content-Type", "application/json");
spec.setBody(JSON.stringify({ key: "value" }));

const { request, response } = await sdk.requests.send(spec);
if (response) {
  const statusCode = response.getCode();
  const body = response.getBody()?.toText();
}
```

For viewing/editing HTTP data in the UI, create editors:

```typescript
const reqEditor = sdk.ui.httpRequestEditor();
const respEditor = sdk.ui.httpResponseEditor();
const reqElement = reqEditor.getElement();
const respElement = respEditor.getElement();
```

## Findings SDK

Findings create alerts when Caido detects notable characteristics in requests/responses. From the **backend**, use `sdk.findings.create`:

```typescript
await sdk.findings.create({
  title: `Success Response ${response.getCode()}`,
  description: `Request ID: ${request.getId()}\nResponse Code: ${response.getCode()}`,
  reporter: "Response Logger Plugin",
  request: request,
  dedupeKey: `${request.getPath()}-${response.getCode()}`, // prevents duplicates
});
```

From the **frontend**, the equivalent is `sdk.findings.createFinding(requestId, { title, description, reporter })`.

## Important Caido SDK Types

```typescript
export type Request = {
  getId(): ID;
  getHost(): string;
  getPort(): number;
  getTls(): boolean;
  getMethod(): string;
  getPath(): string;
  getQuery(): string;
  getUrl(): string;
  getHeaders(): Record<string, Array<string>>;
  getHeader(name: string): Array<string> | undefined;
  getBody(): Body | undefined;
  getRaw(): RequestRaw;
  getCreatedAt(): Date;
  toSpec(): RequestSpec;
  toSpecRaw(): RequestSpecRaw;
};

export type Response = {
  getId(): ID;
  getCode(): number;
  getHeaders(): Record<string, Array<string>>;
  getHeader(name: string): Array<string> | undefined;
  getBody(): Body | undefined;
  getRaw(): ResponseRaw;
  getRoundtripTime(): number;
  getCreatedAt(): Date;
};
```

For `Body` and `Raw` you can use methods like `getBody()?.toText()` to extract text content. Import these types from `caido:utils`:

```typescript
import { type Request, type Response } from "caido:utils";
```

## Code Quality Best Practices

### TypeScript and Code Quality

- Use TypeScript for all files.
- Only use types, not interfaces.
- Do not use `any` type.
- Use `undefined` over `null`.
- Do not add any comments to the code that you generate.
- Don't cast to `any`.
- Don't unnecessarily add `try`/`catch`.
- Use `computed` for derived state instead of reactive variables when possible.
- Use `knip` to remove unused code if making large changes.
- When refactoring, avoid creating alias types like this:
```typescript
export type Options = ScanConfig;
```
Instead, actually rename the type and fix all occurrences if needed.

### Structure, Naming, and Organization

- Follow consistent naming conventions:
    - Folders: camelCase (`intercept`, `replay`, `httpHistory`).
    - Component folders: PascalCase (`PassiveFormCreate`, `PassiveTable`).
    - All other files: camelCase (`useForm.ts`, `assistant.graphql`).
- Avoid massive template blocks; compose smaller components.
- Colocate code that changes together.
- Declare variables close to their usage:
    - Avoid declaring all variables at the top of functions/files.
    - Place variable declarations as close as possible to where they are first used.
    - Group related variables together (e.g., event bus declarations next to their corresponding listeners).

### Simplicity and Readability

- Only create an abstraction if it is actually needed.
- Prefer clear function and variable names over inline comments.
- Avoid helper functions when a simple inline expression would suffice.
- Use built-in Tailwind values, occasionally allow dynamic values, rarely globals.

## Linter

Plugins use ESLint configured at the repo root. After making any significant change, run the linter with `pnpm lint` and fix all issues.

### Most common mistakes that lead to linter errors

Lint Rule: Unexpected nullable string value in conditional. Please handle nullish or empty cases explicitly.

To prevent this, when comparing strings, instead of writing:

```typescript
if (!str) {}
```

do this:

```typescript
if (str !== undefined) {}
```

## SDK API Validation

Always use documented Caido SDK APIs directly without runtime checks or validation.

- Good
  ```typescript
  sdk.window.showToast("Message", { variant: "error" });
  sdk.backend.myFunction();
  sdk.commands.register("my-command", { name: "Command", run: () => {} });
  ```

- Bad (NEVER do this)
  ```typescript
  if ("showToast" in sdk.window && typeof sdk.window.showToast === "function") {
    sdk.window.showToast("Message");
  }
  ```

Rules:

1. Never use runtime API existence checks (`typeof`, `in` operator)
2. Never assume undocumented SDK methods exist
3. If unsure about an API, ask for clarification rather than guessing

The SDK is typed and guaranteed to have the documented methods available.
