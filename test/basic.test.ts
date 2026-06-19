import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
  // `setup` boots a real Nuxt app (with our module) once for this describe block.
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page', async () => {
    // `$fetch` returns the response *body* (here, the rendered HTML).
    const html = await $fetch('/')
    expect(html).toContain('<div>basic</div>')
  })

  it('adds an X-Request-ID header to every response', async () => {
    // `fetch` returns the full Response object, so we can read headers.
    // This proves our server middleware actually ran for the request.
    const res = await fetch('/')
    expect(res.headers.get('x-request-id')).toBeTruthy()
  })
})
