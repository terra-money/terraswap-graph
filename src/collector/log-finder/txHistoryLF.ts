import { createReturningLogFinder, ReturningLogFinderMapper } from '@terra-money/log-finder'
import { trimAssets, addMinus } from 'lib/utils'
import { TxHistoryTransformed } from 'types'
import * as logRules from './log-rules'

const columbus4Index = {
  asset0Token: 2,
  asset0Amount: 4,
  asset1Token: 3,
  asset1Amount: 5,
  provideAssets: 2,
  provideShare: 3,
  withdrawAssets: 3,
  withdrawShare: 2
}

const columbus5Index = {
  asset0Token: 4,
  asset0Amount: 6,
  asset1Token: 5,
  asset1Amount: 7,
  provideAssets: 4,
  provideShare: 5,
  withdrawAssets: 4,
  withdrawShare: 3
}

const logIndex = process.env.TERRA_CHAIN_ID == 'columbus-4' ? columbus4Index : columbus5Index

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

      if (action == 'swap') {
        assets[0].token = match[logIndex.asset0Token].value
        assets[0].amount = match[logIndex.asset0Amount].value
        assets[1].token = match[logIndex.asset1Token].value
        assets[1].amount = addMinus(match[logIndex.asset1Amount].value)
      } else if (action == 'provide_liquidity') {
        assets = trimAssets(match[logIndex.provideAssets].value, true)
        share = match[logIndex.provideShare].value
      } else if (action == 'withdraw_liquidity') {
        assets = trimAssets(match[logIndex.withdrawAssets].value, false)
        share = match[logIndex.withdrawShare].value
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
