import { createReturningLogFinder, ReturningLogFinderMapper } from '@terra-money/log-finder'
import { assetsTrimer } from 'lib/utils'
import { NativeTransferTransformed } from 'types'
import * as logRules from './log-rules'

export function createNativeTransferLogFinders(): ReturningLogFinderMapper<
  NativeTransferTransformed[]
> {
  return createReturningLogFinder(logRules.nativeTransferRule(), (_, match) => {
    const assetsInfo = assetsTrimer(match[2].value, true)
    return assetsInfo.map((asset) => {
      return {
        recipient: match[0].value,
        sender: match[1].value,
        assets: asset,
      }
    })
  })
}
