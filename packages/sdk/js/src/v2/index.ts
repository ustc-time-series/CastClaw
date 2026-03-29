export * from "./client.js"
export * from "./server.js"

import { createCastClawClient } from "./client.js"
import { createCastClawServer } from "./server.js"
import type { ServerOptions } from "./server.js"

export async function createCastClaw(options?: ServerOptions) {
  const server = await createCastClawServer({
    ...options,
  })

  const client = createCastClawClient({
    baseUrl: server.url,
  })

  return {
    client,
    server,
  }
}
