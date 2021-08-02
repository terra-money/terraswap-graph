import 'reflect-metadata'
import * as bluebird from 'bluebird'
import { initORM } from 'orm'
import { ReturningLogFinderMapper } from '@terra-money/log-finder'
import { init as initErrorHandler, errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { initMantle } from 'lib/terra'
import {
  createCreatePairLogFinders,
  createTxHistoryFinders,
  createNativeTransferLogFinders,
  createNonnativeTransferLogFinders,
} from 'collector/log-finder'
import {
  TxHistoryTransformed,
  NativeTransferTransformed,
  NonnativeTransferTransformed,
  createPairTransformed,
} from 'types'
import { validateConfig } from 'config'
import { collect } from './collect'
import config from 'config'

bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } })
global.Promise = bluebird as any // eslint-disable-line

async function loop(
  createCreatePairLogFinders: ReturningLogFinderMapper<createPairTransformed>,
  createTxHistoryFinders: ReturningLogFinderMapper<TxHistoryTransformed>[],
  createNativeTransferLogFinders: ReturningLogFinderMapper<NativeTransferTransformed[]>,
  createNonnativeTransferLogFinders: ReturningLogFinderMapper<NonnativeTransferTransformed>[]
): Promise<void> {
  for (;;) {
    await collect(
      createCreatePairLogFinders,
      createTxHistoryFinders,
      createNativeTransferLogFinders,
      createNonnativeTransferLogFinders
    )
  }
}

async function main(): Promise<void> {
  logger.info(`Initialize collector, start_block_height: ${config.START_BLOCK_HEIGHT}`)

  initErrorHandler({ sentryDsn: process.env.SENTRY })

  validateConfig()

  await initORM()

  initMantle(process.env.TERRA_MANTLE)

  const createPairFinder = createCreatePairLogFinders()
  const txHistoryFinder = createTxHistoryFinders()
  const createNativeTransferLogFinder = createNativeTransferLogFinders()
  const nonnativeTranferLogFinder = createNonnativeTransferLogFinders()

  logger.info('Start collecting')
  await loop(
    createPairFinder,
    txHistoryFinder,
    createNativeTransferLogFinder,
    nonnativeTranferLogFinder
  )
}

if (require.main === module) {
  main().catch(errorHandler)
}
