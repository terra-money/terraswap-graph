import { createReturningLogFinder, ReturningLogFinderMapper } from '@terra-money/log-finder'
import { NonnativeTransferTransformed } from 'types'
import * as logRules from './log-rules'

export function createNonnativeTransferLogFinder(): ReturningLogFinderMapper<NonnativeTransferTransformed> {
  return createReturningLogFinder(logRules.nonnativeTransferRule(), (_, match) => {
    if (match[4]?.key === 'by') {
      return {
        addresses: {
          from: match[2].value,
          to: match[3].value,
        },
        assets: {
          token: match[0].value,
          amount: match[5].value,
        },
      }
    } else if (match[4]?.key === 'amount') {
      return {
        addresses: {
          from: match[2].value,
          to: match[3].value,
        },
        assets: {
          token: match[0].value,
          amount: match[4].value,
        },
      }
    }
  })
}
