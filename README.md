<p align="center">
  <img src="./assets/logo.png" alt="Nuxt Server Log" width="140" height="140">
</p>

<h1 align="center">Nuxt Server Log</h1>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Structured, per-request server-side logging for Nuxt (Nitro). For every incoming
request it emits a single JSON log line that bundles together:

- the **request** itself (method, path, status, duration, client IP, request id),
- every **outgoing API call** made on the server while handling that request, and
- every **error** thrown during that request.

This works for both your API routes **and your server-rendered (SSR) pages**: when
a page is rendered on the server, every data-fetching call your app makes during
that render is captured under the page's request — so you can see exactly which
upstream calls contributed to a page, how long each took, and which one made the
page slow.

This gives you one correlated, machine-readable record per request — ready to ship
to Elasticsearch, Loki, Datadog, or any log pipeline that ingests JSON.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)

## Features

- 📦 &nbsp;**One JSON log per request** — request, API calls, and errors correlated by a shared `requestId`.
- 🖥️ &nbsp;**SSR page insight** — see every upstream call a server-rendered page made during its render, and exactly how long each took.
- 🌐 &nbsp;**Automatic outbound API tracking** — server-side `fetch` calls are captured with URL, status, method, and duration.
- 🧨 &nbsp;**Automatic error capture** — unhandled Nitro errors are recorded against the request that caused them.
- 🐢 &nbsp;**Slow-call warnings** — configurable thresholds warn on slow responses and slow API calls.
- 🔐 &nbsp;**Query redaction** — sensitive query params (tokens, passwords, …) are redacted by default.
- 🎚️ &nbsp;**Sampling & filtering** — log a fraction of traffic and exclude noisy paths.
- 🪪 &nbsp;**`X-Request-ID` header** — added to every response for end-to-end tracing.
- 🧷 &nbsp;**Crash-safe** — circular references and BigInt never break logging.

## Quick Setup

Install the module:

```bash
npx nuxt module add nuxt-server-log
```

Or manually:

```bash
npm install nuxt-server-log
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["nuxt-server-log"],
});
```

That's it. Requests are now logged to the server console as JSON. ✨

## Configuration

Configure the module under the `serverLog` key in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["nuxt-server-log"],
  serverLog: {
    logLevel: "info",
    sampleRate: 1,
    excludePaths: ["/__nuxt_error", "/_nuxt"],
    apiDurationWarning: 1500,
    responseDurationWarning: 3000,
    remoteAddressHeader: "x-real-ip",
    redactQueryKeys: ["token", "password", "secret"],
    traceDepth: 10,
  },
});
```

| Option                    | Type                                     | Default                                                                                                          | Description                                                                                                            |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `enabled`                 | `boolean`                                | `true`                                                                                                           | Master switch. When `false`, the module registers nothing.                                                             |
| `logLevel`                | `"debug" \| "info" \| "warn" \| "error"` | `"info"`                                                                                                         | Minimum level for the module's own log messages (e.g. slow-call warnings). The per-request log line is always emitted. |
| `sampleRate`              | `number`                                 | `1`                                                                                                              | Fraction of requests to log, from `0` (none) to `1` (all). E.g. `0.1` logs ~10% of requests.                           |
| `excludePaths`            | `string[]`                               | `["/__nuxt_error"]`                                                                                              | Requests whose path **starts with** any of these are not logged.                                                       |
| `apiDurationWarning`      | `number`                                 | `1500`                                                                                                           | Emit a `warn` when a captured API call exceeds this many milliseconds.                                                 |
| `responseDurationWarning` | `number`                                 | `3000`                                                                                                           | Emit a `warn` when total request duration exceeds this many milliseconds.                                              |
| `remoteAddressHeader`     | `string`                                 | `undefined`                                                                                                      | Header to read the client IP from (e.g. behind a proxy). Falls back to `X-Forwarded-For` / socket address.             |
| `redactQueryKeys`         | `string[]`                               | `["token", "password", "secret", "apiKey", "api_key", "auth", "authorization", "access_token", "refresh_token"]` | Query-string keys whose values are replaced with `[REDACTED]` in logs (case-insensitive).                              |
| `traceDepth`              | `number`                                 | `10`                                                                                                             | Maximum number of stack-trace frames recorded per error.                                                               |

> [!NOTE]
> `remoteAddressHeader` and `X-Forwarded-For` are client-controllable and can be
> spoofed unless your app sits behind a trusted proxy that overwrites them.

## How it works

The module registers three pieces of Nitro runtime:

1. **A server middleware** that opens a per-request context (via `AsyncLocalStorage`),
   assigns a `requestId`, sets the `X-Request-ID` response header, and writes the
   final JSON log line once the response finishes (or the connection closes).
2. **A `fetch` interceptor** that wraps `globalThis.fetch`, so any server-side
   API call is recorded into the current request's context.
3. **An error hook** that records unhandled Nitro errors against the active request.

Because everything is tied together through the request context, a single log line
tells the full story of what happened during that request.

## Example output

A **server-rendered page** (`GET /`) whose render fetched data from four upstream
APIs. The whole page took ~2s, and you can immediately see that one categories
call (1259ms) dominated the render time:

```json
{
  "@timestamp": "2026-06-19T11:32:03.271Z",
  "requestId": "2ce40ef3-a8d0-4642-82d7-e15bcbf418dc",
  "userAgent": "unknown",
  "statusCode": 200,
  "method": "GET",
  "path": "/",
  "query": "",
  "remoteAddress": "::ffff:127.0.0.1",
  "duration": 2012,
  "apiCalls": [
    {
      "@timestamp": "2026-06-19T11:32:01.482Z",
      "statusCode": 200,
      "url": "https://api.example.com/v1/categories/",
      "method": "GET",
      "duration": 1259
    },
    {
      "@timestamp": "2026-06-19T11:32:02.801Z",
      "statusCode": 200,
      "url": "https://api.example.com/v1/sliders/",
      "method": "GET",
      "duration": 91
    }
  ],
  "errors": []
}
```

An API route that made one upstream API call:

```json
{
  "@timestamp": "2026-06-19T11:34:41.959Z",
  "requestId": "ffbc6274-a7f0-40d6-86fe-1e4154ab1f1b",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "statusCode": 200,
  "method": "GET",
  "path": "/api/products",
  "query": "?token=%5BREDACTED%5D&page=2",
  "remoteAddress": "203.0.113.7",
  "duration": 142,
  "apiCalls": [
    {
      "@timestamp": "2026-06-19T11:34:41.820Z",
      "statusCode": 200,
      "url": "https://api.example.com/products?page=2",
      "method": "GET",
      "duration": 98
    }
  ],
  "errors": []
}
```

A request where an upstream call failed and an error was thrown:

```json
{
  "@timestamp": "2026-06-19T11:35:02.114Z",
  "requestId": "a18d2f90-1c4e-4b2a-9a77-2f0b5c9d11aa",
  "userAgent": "node",
  "statusCode": 500,
  "method": "POST",
  "path": "/api/checkout",
  "query": "",
  "remoteAddress": "203.0.113.7",
  "duration": 233,
  "apiCalls": [
    {
      "@timestamp": "2026-06-19T11:35:02.020Z",
      "statusCode": 503,
      "url": "https://payments.example.com/charge",
      "method": "POST",
      "duration": 180,
      "error": "HTTP Error 503: Service Unavailable"
    }
  ],
  "errors": [
    {
      "@timestamp": "2026-06-19T11:35:02.110Z",
      "error": "Payment provider unavailable",
      "type": "Error",
      "trace": [
        "at chargeCard (server/api/checkout.post.ts:24:11)",
        "at handler (server/api/checkout.post.ts:10:3)"
      ],
      "action": "unhandled"
    }
  ]
}
```

In addition to the per-request line, slow requests/calls produce standalone `warn`
entries, e.g.:

```json
{
  "@timestamp": "…",
  "level": "warn",
  "message": "Slow API call detected",
  "requestId": "…",
  "url": "https://api.example.com/products",
  "duration": 1820
}
```

## Contribution

Contributions are welcome! The flow is the standard GitHub one: fork the repo,
create a branch, and open a pull request.

## License

[MIT](./LICENSE)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/nuxt-server-log/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-server-log
[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-server-log.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-server-log
[license-src]: https://img.shields.io/npm/l/nuxt-server-log.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-server-log
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt
[nuxt-href]: https://nuxt.com
