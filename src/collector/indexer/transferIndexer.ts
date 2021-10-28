import { EntityManager } from 'typeorm'
import { ExchangeRate, NonnativeTransferTransformed, NativeTransferTransformed } from 'types'
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
  for(const logFound of founds) {
    const transformed = logFound.transformed

    if (transformed && transformed[0]) {
      for (const transData of transformed) {
        let pair = ''
        if (pairList[transData.recipient]) {
          pair = transData.recipient
        } else if (pairList[transData.sender]) {
          pair = transData.sender
          transData.assets.amount = '-' + transData.assets.amount
        }
  
        if (pair !== '') {
          const tokenReserve = await getLatestReserve(manager, pair)
          const updatedReserve = addReserve(tokenReserve, transData.assets)
          const liquidity = await getLiquidityAsUST(
            manager,
            updatedReserve,
            timestamp,
            exchangeRate
          )
    
          await updateExchangeRate(manager, updatedReserve, liquidity, timestamp, pair)
    
          await updateReserves(manager, updatedReserve, liquidity, timestamp, pair)
        }
      }
    }
  }
}

export async function NonnativeTransferIndexer(
  pairList: Record<string, boolean>,
  tokenList: Record<string, boolean>,
  manager: EntityManager,
  timestamp: string,
  exchangeRate: ExchangeRate | undefined,
  founds: ReturningLogFinderResult<NonnativeTransferTransformed>[]
): Promise<void> {
  for(const logFound of founds){
    const transformed = logFound.transformed

    const pairRelative = isPairRelative(transformed, pairList)

    const validToken = tokenList[transformed?.assets?.token]
      ? transformed.assets.token
      : undefined

    if (pairRelative && transformed && validToken) {
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

      await updateExchangeRate(manager, updatedReserve, liquidity, timestamp, transferTransformed.pairAddress)

      await updateReserves(manager, updatedReserve, liquidity, timestamp, transferTransformed.pairAddress)
    }
  }
}

function isPairRelative(
  transformed: NonnativeTransferTransformed,
  pairAddresses: Record<string, boolean>
): string[] | undefined {
  if (!pairAddresses) return
  if (pairAddresses[transformed.addresses.from]) return ['from', transformed.addresses.from]
  if (pairAddresses[transformed.addresses.to]) return ['to', transformed.addresses.to]
  return
}
