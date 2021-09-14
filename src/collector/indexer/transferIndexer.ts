import { EntityManager } from 'typeorm'
import { Tx, ExchangeRate, NonnativeTransferTransformed } from 'types'
import { mapSeries } from 'bluebird'
import { addMinus } from 'lib/utils'
import {
  getLatestReserve,
  addReserve,
  getLiquidityAsUST,
  updateExchangeRate,
  updateReserves,
} from './transferUpdater'
import { createNativeTransferLogFinders, createNonnativeTransferLogFinder } from '../log-finder'

export async function NativeTransferIndexer(
  pairAddresses: Record<string, boolean>,
  entityManager: EntityManager,
  txs: Tx[],
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  const logFinder = createNativeTransferLogFinders()

  await mapSeries(txs, async (tx) => {
    const timestamp = tx.timestamp

    await mapSeries(tx.logs, async (log) => {
      const events = log.events

      await mapSeries(events, async (event) => {
        if (event.attributes.length > 1800) return
        const logFounds = logFinder(event)

        await mapSeries(logFounds, async (logFound) => {
          if (!logFound) return

          const transformed = logFound.transformed

          if (!transformed || !transformed[0]) return

          await mapSeries(transformed, async (transData) => {
            let pair = ''
            if (pairAddresses[transData.recipient]) {
              pair = transData.recipient
            } else if (pairAddresses[transData.sender]) {
              pair = transData.sender
              transData.assets.amount = '-' + transData.assets.amount
            }

            if (pair == '') return

            const tokenReserve = await getLatestReserve(entityManager, pair)
            const updatedReserve = addReserve(tokenReserve, transData.assets)
            const liquidity = await getLiquidityAsUST(
              entityManager,
              updatedReserve,
              timestamp,
              exchangeRate
            )

            await updateExchangeRate(entityManager, updatedReserve, liquidity, timestamp, pair)

            await updateReserves(entityManager, updatedReserve, liquidity, timestamp, pair)
          })
        })
      })
    })
  })
}

export async function NonnativeTransferIndexer(
  pairAddresses: Record<string, boolean>,
  tokenAddresses: Record<string, boolean>,
  entityManager: EntityManager,
  txs: Tx[],
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  const logFinder = createNonnativeTransferLogFinder()

  await mapSeries(txs, async (tx) => {
    const timestamp = tx.timestamp

    await mapSeries(tx.logs, async (log) => {
      const events = log.events

      await mapSeries(events, async (event) => {
        if (event.attributes.length > 1800) return
        const logFounds = logFinder(event)

        await mapSeries(logFounds, async (logFound) => {
          if (!logFound) return

          const transformed = logFound.transformed

          if (!transformed) return

          const pairRelative = isPairRelative(transformed, pairAddresses)

          if (!pairRelative) return

          const validToken = tokenAddresses[transformed.assets.token]
            ? transformed.assets.token
            : undefined

          if (!validToken) return

          const transferTransformed = {
            pairAddress: pairRelative[1],
            assets: {
              token: transformed.assets.token,
              amount:
                pairRelative[0] === 'to'
                  ? transformed.assets.amount
                  : addMinus(transformed.assets.amount),
            },
          }

          const tokenReserve = await getLatestReserve(
            entityManager,
            transferTransformed.pairAddress
          )
          const updatedReserve = addReserve(tokenReserve, transferTransformed.assets)
          const liquidity = await getLiquidityAsUST(
            entityManager,
            updatedReserve,
            timestamp,
            exchangeRate
          )

          await updateExchangeRate(
            entityManager,
            updatedReserve,
            liquidity,
            timestamp,
            transferTransformed.pairAddress
          )

          await updateReserves(
            entityManager,
            updatedReserve,
            liquidity,
            timestamp,
            transferTransformed.pairAddress
          )
        })
      })
    })
  })
}

function isPairRelative(
  transformed: NonnativeTransferTransformed,
  pairAddresses: Record<string, boolean>
): string[] | undefined {
  if (pairAddresses[transformed.addresses.from]) return ['from', transformed.addresses.from]
  if (pairAddresses[transformed.addresses.to]) return ['to', transformed.addresses.to]
  return
}
