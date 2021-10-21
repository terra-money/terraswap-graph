import { EntityManager } from 'typeorm'
import { ExchangeRate, NonnativeTransferTransformed, NativeTransferTransformed } from 'types'
import { mapSeries } from 'bluebird'
import { addMinus } from 'lib/utils'
import {
  getLatestReserve,
  addReserve,
  getLiquidityAsUST,
  updateExchangeRate,
  updateReserves,
} from './transferUpdater'
import { ReturningLogFinderResult } from '@terra-money/log-finder'

export async function NativeTransferIndexer(
  pairList: Record<string, boolean>,
  manager: EntityManager,
  exchangeRate: ExchangeRate | undefined,
  timestamp: string,
  founds: ReturningLogFinderResult<NativeTransferTransformed[]>[]
): Promise<void> {
  await mapSeries(founds, async (logFound) => {
    if (!logFound) return

    const transformed = logFound.transformed

    if (!transformed || !transformed[0]) return

    await mapSeries(transformed, async (transData) => {
      let pair = ''
      if (pairList[transData.recipient]) {
        pair = transData.recipient
      } else if (pairList[transData.sender]) {
        pair = transData.sender
        transData.assets.amount = '-' + transData.assets.amount
      }

      if (pair == '') return

      const tokenReserve = await getLatestReserve(manager, pair)
      const updatedReserve = addReserve(tokenReserve, transData.assets)
      const liquidity = await getLiquidityAsUST(
        manager,
        updatedReserve,
        timestamp,
        exchangeRate
      )

      updateExchangeRate(manager, updatedReserve, liquidity, timestamp, pair)

      updateReserves(manager, updatedReserve, liquidity, timestamp, pair)
    })
  })
}

export async function NonnativeTransferIndexer(
  pairList: Record<string, boolean>,
  tokenList: Record<string, boolean>,
  manager: EntityManager,
  timestamp: string,
  exchangeRate: ExchangeRate | undefined,
  founds: ReturningLogFinderResult<NonnativeTransferTransformed>[]
): Promise<void> {
  await mapSeries(founds, async (logFound) => {
    if (!logFound) return

    const transformed = logFound.transformed

    if (!transformed) return

    const pairRelative = isPairRelative(transformed, pairList)

    if (!pairRelative) return

    const validToken = tokenList[transformed.assets.token]
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
      manager,
      transferTransformed.pairAddress
    )
    const updatedReserve = addReserve(tokenReserve, transferTransformed.assets)
    const liquidity = await getLiquidityAsUST(
      manager,
      updatedReserve,
      timestamp,
      exchangeRate
    )

    updateExchangeRate(manager, updatedReserve, liquidity, timestamp, transferTransformed.pairAddress)

    updateReserves(manager, updatedReserve, liquidity, timestamp, transferTransformed.pairAddress
    )
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
