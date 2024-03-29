import { createReturningLogFinder, ReturningLogFinderMapper } from '@terra-money/log-finder'
import { trimAssets, addMinus } from 'lib/utils'
import { TxHistoryTransformed } from 'types'
import * as logRules from './log-rules'

export function createSPWFinder(
  pairAddresses: Record<string, boolean>
): ReturningLogFinderMapper<TxHistoryTransformed> {
  return createReturningLogFinder(logRules.spwRule(), (_, match) => {
    if (pairAddresses[match[0].value]) {
      const action = match[1].value
      let assets = [
        {
          token: '',
          amount: '',
        },
        {
          token: '',
          amount: '',
        },
      ]
      let share = '0'

      if (action === 'swap') {
        assets[0].token = match[4].value
        assets[0].amount = match[6].value
        assets[1].token = match[5].value
        assets[1].amount = addMinus(match[7].value)
      } else if (action === 'provide_liquidity') {
        assets = trimAssets(match[4].value, true)
        share = match[5].value
      } else if (action === 'withdraw_liquidity') {
        assets = trimAssets(match[4].value, false)
        share = match[3].value
      }

      const transformed = {
        pair: match[0].value,
        action: match[1].value,
        assets,
        share,
      }

      return transformed
    }
    return
  })
}
