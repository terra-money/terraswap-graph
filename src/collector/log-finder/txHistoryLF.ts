import { createReturningLogFinder, ReturningLogFinderMapper } from '@terra-money/log-finder'
import { assetsTrimer, addMinus } from 'lib/utils'
import { TxHistoryTransformed } from 'types'
import * as logRules from './log-rules'

export function createSPWFinder(
  pairAddresses: string[]
): ReturningLogFinderMapper<TxHistoryTransformed> {
  return createReturningLogFinder(logRules.spwRule(), (_, match) => {
    for (const pairAddress of pairAddresses) {
      if (match[0].value == pairAddress) {
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

        if (action == 'swap') {
          assets[0].token = match[2].value
          assets[0].amount = match[4].value
          assets[1].token = match[3].value
          assets[1].amount = addMinus(match[5].value)
        } else if (action == 'provide_liquidity') {
          assets = assetsTrimer(match[2].value, true)
          share = match[3].value
        } else if (action == 'withdraw_liquidity') {
          assets = assetsTrimer(match[3].value, false)
          share = match[2].value
        }

        const transformed = {
          pair: match[0].value,
          action: match[1].value,
          assets,
          share,
        }

        return transformed
      }
    }
    return
  })
}
