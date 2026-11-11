# 403Bypasser

403Bypasser tries to get past `403 Forbidden` responses by sending many variations of a request. Each variation comes from a **template**: a small JavaScript script that transforms the original request.

## Usage

Right-click a request anywhere in Caido (HTTP History, Replay, Sitemap, Automate…) and choose **403Bypasser: Scan**, or run the command from the command palette. Up to 25 selected rows can be scanned at once.

Open **403 Bypasser** in the sidebar to follow scans live, sort and filter results by status code, length or template, inspect each request/response and send it to Replay.

## Templates

Templates are stored as YAML files in the plugin's data directory and can be imported and exported from the **Templates** tab:

```yaml
id: add-json-extension
description: Appends .json to the path
enabled: true
modificationScript: |-
  return helper.setPath(input, (path) => path + ".json");
```

The script receives `input` (the raw request) and `helper`, and returns one request string or an array of them. Helpers return a modified copy of the request; setters accept a value or a function of the current value:

| Helper | |
| --- | --- |
| `helper.setLine(input, 0, (line) => line.toUpperCase())` | Replace a line of the raw request |
| `helper.setMethod(input, "POST")` | |
| `helper.setPath(input, (path) => path + "/")` | |
| `helper.setQuery(input, (query) => query + "&debug=1")` | |
| `helper.setBody(input, "hello")` | |
| `helper.addQueryParameter(input, "debug=1")` | |
| `helper.addHeader(input, "X-Forwarded-For: 127.0.0.1")` | |
| `helper.removeHeader(input, "User-Agent")` | |
| `helper.getMethod`, `getPath`, `getQuery`, `getBody`, `hasHeader` | Read parts of the request |

Characters up to `\xFF` are sent as raw bytes, so templates can emit any byte (for example `"\x85"`).

The editor has a test panel that runs the script against a sample request, and an **AI** button that generates or refines a template with any model configured in Caido's AI settings. Generated scripts are run against the test request and the model is asked to fix them if they fail.

## Development

```bash
mise install
pnpm install
pnpm validate   # typecheck, lint, knip, tests
pnpm build      # dist/plugin_package.zip
```
