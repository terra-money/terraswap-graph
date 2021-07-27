import * as http from 'http'
import * as logger from 'lib/logger'
import config from 'config'
import { initApp } from './app'
import { initGraphQL, finalizeGraphQL } from './graphql'

let server: http.Server

export async function initServer(): Promise<http.Server> {
  logger.info('Initialize app')
  const app = await initApp()

  logger.info('Initialize GraphQL')
  await initGraphQL(app)

  server = http.createServer(app.callback())

  server.listen(config.PORT, () => {
    logger.info(`Listening on port ${config.PORT}`)
  })

  return server
}

export async function finalizeServer(): Promise<void> {
  await finalizeGraphQL()

  server.close()
}
