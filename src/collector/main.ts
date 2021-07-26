import 'reflect-metadata'
import * as bluebird from 'bluebird'
import { initORM } from 'orm'
import { init as initErrorHandler, errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { initMantle } from 'lib/terra'
import { validateConfig } from 'config'
import { collect } from './collect'
import config from 'config'

bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = bluebird as any // eslint-disable-line

async function loop(): Promise<void> {
  for (;;) {
    await collect()
  }
}

async function main(): Promise<void> {
  logger.info(`Initialize collector, start_block_height: ${config.START_BLOCK_HEIGHT}`)

  initErrorHandler({ sentryDsn: process.env.SENTRY })

  validateConfig()

  await initORM()

  initMantle(process.env.TERRA_MANTLE)

  logger.info('Start collecting')
  await loop()
}

if (require.main === module) {
  main().catch(errorHandler)
}
