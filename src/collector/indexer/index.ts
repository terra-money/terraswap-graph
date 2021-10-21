import { EntityManager } from 'typeorm'
import { Tx, ExchangeRate } from 'types'
import { generateTerraswapRow } from './txHistoryUpdater'
import { createCreatePairLogFinders, createSPWFinder, createNativeTransferLogFinders, createNonnativeTransferLogFinder } from '../log-finder'
import { mapSeries } from 'bluebird'
import { CreatePairIndexer } from './createPairIndexer'
import { TxHistoryIndexer } from './txHistoryIndexer'
import { NativeTransferIndexer, NonnativeTransferIndexer } from './transferIndexer'

const factoryAddress = process.env.TERRA_CHAIN_ID.indexOf('columbus') === -1
  ?'terra18qpjm4zkvqnpjpw0zn0tdr8gdzvt8au35v45xf' //testnet
  :'terra1ulgw0td86nvs4wtpsc80thv6xelk76ut7a7apj' //mainnet

const createPairLF = createCreatePairLogFinders(factoryAddress)
const nativeTransferLF = createNativeTransferLogFinders()
const nonnativeTransferLF = createNonnativeTransferLogFinder()

export async function runIndexers(
  manager: EntityManager,
  txs: Tx[],
  exchangeRate: ExchangeRate | undefined,
  pairList: Record<string, boolean>,
  tokenList: Record<string, boolean>
): Promise<void> {
  await mapSeries(txs, async (tx) => {
    const Logs = tx.logs
    const timestamp = tx.timestamp
    const txHash = tx.txhash

    await mapSeries(Logs, async (log) => {
      const events = log.events

      await mapSeries(events, async (event) => {
        // for spam tx
        if (event.attributes.length > 1800) return

        // createPair
        const createPairLogFounds = createPairLF(event)
        await CreatePairIndexer(pairList, tokenList, manager, timestamp, createPairLogFounds)

        // txHistory
        const spwfLF = createSPWFinder(pairList)
        const spwfLogFounds = spwfLF(event)

        await TxHistoryIndexer(manager, exchangeRate, timestamp, txHash, spwfLogFounds)

        // native transfer
        const nativeTransferLogFounds = nativeTransferLF(event)

        await NativeTransferIndexer(pairList, manager, exchangeRate, timestamp, nativeTransferLogFounds)

        // nonnative transfer
        const nonnativeTransferLogFounds = nonnativeTransferLF(event)

        await NonnativeTransferIndexer(pairList, tokenList, manager, timestamp, exchangeRate, nonnativeTransferLogFounds)
      })
    })
  })

  if (txs[0]) {
    generateTerraswapRow(txs[0].timestamp, manager)
  }
}