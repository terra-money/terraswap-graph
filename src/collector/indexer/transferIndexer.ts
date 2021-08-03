import { EntityManager } from 'typeorm'
import { Block, ExchangeRate, NonnativeTransferTransformed } from 'types'
import { mapSeries } from 'bluebird'
import { convertLegacyMantleEventsToNew } from '@terra-money/hive/compatibility/legacy-mantle'
import { addMinus } from 'lib/utils'
import {
  latestReserve,
  addingReserve,
  liquidityUST,
  updateExchangeRate,
  updateReserves,
  updateTotalLiquidity,
} from './transferUpdater'
import { createNativeTransferLogFinders, createNonnativeTransferLogFinders } from '../log-finder'

export async function NativeTransferIndexer(
  pairAddresses: string[],
  entityManager: EntityManager,
  block: Block,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  const logFinder = createNativeTransferLogFinders()
  const Txs = block.Txs

  await mapSeries(Txs, async (tx) => {
    const Logs = tx.Logs
    const timestamp = tx.TimestampUTC

    await mapSeries(Logs, async (log) => {
      const events = log.Events

      await mapSeries(events, async (event) => {
        if (event.Attributes.length > 1800) return
        const logFounds = logFinder(convertLegacyMantleEventsToNew(event))

        await mapSeries(logFounds, async (logFound) => {
          if (!logFound) return

          const transformed = logFound.transformed

          if (!transformed || !transformed[0]) return

          await mapSeries(transformed, async (transData) => {
            let pair = ''

            for (const address of pairAddresses) {
              if (transData.recipient == address) {
                pair = address
                break
              } else if (transData.sender == address) {
                pair = address
                transData.assets.amount = '-' + transData.assets.amount
                break
              }
            }

            if (pair == '') return

            const tokenReserve = await latestReserve(entityManager, pair)
            const updatedReserve = addingReserve(tokenReserve, transData.assets)
            const liquidity = await liquidityUST(
              entityManager,
              updatedReserve,
              timestamp,
              exchangeRate
            )

            await updateExchangeRate(entityManager, updatedReserve, liquidity, timestamp, pair)

            await updateReserves(entityManager, updatedReserve, liquidity, pair)
          })
        })
      })
    })
  })
  await updateTotalLiquidity(entityManager)
}

export async function NonnativeTransferIndexer(
  pairAddresses: string[],
  tokenAddresses: string[],
  entityManager: EntityManager,
  block: Block,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  const logFinders = createNonnativeTransferLogFinders()
  const Txs = block.Txs

  await mapSeries(Txs, async (tx) => {
    const Logs = tx.Logs
    const timestamp = tx.TimestampUTC

    await mapSeries(Logs, async (log) => {
      const events = log.Events

      await mapSeries(events, async (event) => {
        await mapSeries(logFinders, async (logFinder) => {
          if (event.Attributes.length > 1800) return
          const logFounds = logFinder(convertLegacyMantleEventsToNew(event))

          await mapSeries(logFounds, async (logFound) => {
            if (!logFound) return

            const transformed = logFound.transformed

            if (!transformed) return

            const pairRelative = isPairRelative(transformed, pairAddresses)

            if (!pairRelative) return

            const validToken = tokenAddresses.find((token) => token == transformed.assets.token)

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

            const tokenReserve = await latestReserve(entityManager, transferTransformed.pairAddress)
            const updatedReserve = addingReserve(tokenReserve, transferTransformed.assets)
            const liquidity = await liquidityUST(
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
              transferTransformed.pairAddress
            )
          })
        })
      })
    })
  })
  await updateTotalLiquidity(entityManager)
}

function isPairRelative(
  transformed: NonnativeTransferTransformed,
  pairAddresses: string[]
): string[] | undefined {
  for (const i of pairAddresses) {
    if (transformed.addresses.from === i) return ['from', i]
    if (transformed.addresses.to === i) return ['to', i]
  }
  return
}
