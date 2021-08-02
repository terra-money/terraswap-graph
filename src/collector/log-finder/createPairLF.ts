import { createReturningLogFinder, ReturningLogFinderMapper } from '@terra-money/log-finder'
import { createPairTransformed } from 'types'
import * as logRules from './log-rules'

const factoryAddress = 'terra1ulgw0td86nvs4wtpsc80thv6xelk76ut7a7apj'

export function createCreatePairLogFinders(): ReturningLogFinderMapper<createPairTransformed> {
  return createReturningLogFinder(logRules.createPairRule(factoryAddress), (_, match) => {
    return {
      assets: match[2].value.split('-'),
      pairAddress: match[3].value,
      lpTokenAddress: match[4].value,
    }
  })
}
