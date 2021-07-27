import 'reflect-metadata'
import * as bluebird from 'bluebird'
import { once } from 'lodash'
import { initMantle } from 'lib/terra'
import * as logger from 'lib/logger'
import { init as initErrorHandler, errorHandler } from 'lib/error'
import { initORM, finalizeORM } from 'orm'
import { initServer, finalizeServer } from 'loaders'
import { validateConfig } from 'config'

bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = bluebird as any // eslint-disable-line

async function gracefulShutdown(): Promise<void> {
  // Docker will stop to direct traffic 10 seconds after stop signal
  logger.info('Shutdown procedure started')
  await bluebird.delay(+process.env.SHUTDOWNTIMEOUT ?? 10000)

  // Stop accepting new connection
  logger.info('Closing listening port')
  await finalizeServer()
  await bluebird.delay(+process.env.SHUTDOWNTIMEOUT ?? 30000)

  // Close db connections
  logger.info('Closing db connection')
  await finalizeORM()

  logger.info('Finished')
  process.exit(0)
}

async function main(): Promise<void> {
  logger.info('Initialize terraswap-graph')

  initErrorHandler({ sentryDsn: process.env.SENTRY })

  validateConfig()

  await initORM()

  initMantle(process.env.TERRA_MANTLE)

  await initServer()

  // attach graceful shutdown
  const signals = ['SIGHUP', 'SIGINT', 'SIGTERM'] as const
  signals.forEach((signal) => process.on(signal, once(gracefulShutdown)))
}

if (require.main === module) {
  main().catch(errorHandler)
}
