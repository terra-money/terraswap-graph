import { createReturningLogFinder, ReturningLogFinderMapper } from '@terra-money/log-finder'
import { assetsTrimer, addMinus } from 'lib/utils'
import { TxHistoryTransformed } from 'types'
import * as logRules from './log-rules'

export function createTxHistoryFinders(): ReturningLogFinderMapper<TxHistoryTransformed>[] {
  return [
    createReturningLogFinder(logRules.swapRule(), (_, match) => {
      return {
        pair: match[0].value,
        action: match[1].value,
        assets: [
          {
            token: match[2].value,
            amount: match[4].value,
          },
          {
            token: match[3].value,
            amount: addMinus(match[5].value),
          },
        ],
        share: '0',
      }
    }),
    createReturningLogFinder(logRules.provideLiquidityRule(), (_, match) => {
      const assetsInfo = assetsTrimer(match[2].value, true)
      return {
        pair: match[0].value,
        action: match[1].value,
        assets: assetsInfo,
        share: match[3].value,
      }
    }),
    createReturningLogFinder(logRules.withdrawLiquidityRule(), (_, match) => {
      const assetsInfo = assetsTrimer(match[3].value, false)
      return {
        pair: match[0].value,
        action: match[1].value,
        assets: assetsInfo,
        share: match[2].value,
      }
    }),
  ]
}
