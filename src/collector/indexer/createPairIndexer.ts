import { EntityManager } from 'typeorm'
import { mapSeries } from 'bluebird'
import { Tx, Cycle } from 'types'
import { addTokenInfo, addPairInfo } from './createPairUpdater'
import { createCreatePairLogFinders } from '../log-finder'
import { updateOrAddTxns } from './txHistoryUpdater'

//const factoryAddress = 'terra1ulgw0td86nvs4wtpsc80thv6xelk76ut7a7apj'

const factoryAddress = 'terra18qpjm4zkvqnpjpw0zn0tdr8gdzvt8au35v45xf'


export async function CreatePairIndexer(
  pairs: Record<string, boolean>,
  tokens: Record<string, boolean>,
  entityManager: EntityManager,
  txs: Tx[]
): Promise<void> {
  const logFinder = createCreatePairLogFinders(factoryAddress)
  await mapSeries(txs, async (tx) => {
    const Logs = tx.logs
    const timestamp = tx.timestamp

    await mapSeries(Logs, async (log) => {
      const events = log.events

      await mapSeries(events, async (event) => {
        if (event.attributes.length > 1800) return
        const logFounds = logFinder(event)

        await mapSeries(logFounds, async (logFound) => {
          if (!logFound) return

          const transformed = logFound.transformed

          if (!transformed) return

          await addTokenInfo(tokens, entityManager, transformed.assets[0], transformed.pairAddress)
          await addTokenInfo(tokens, entityManager, transformed.assets[1], transformed.pairAddress)
          await addPairInfo(pairs, entityManager, transformed)
          await updateOrAddTxns(Cycle.DAY, timestamp, entityManager, transformed.pairAddress)
          await updateOrAddTxns(Cycle.HOUR, timestamp, entityManager, transformed.pairAddress)
        })
      })
    })
  })
}
