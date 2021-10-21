import { EntityManager } from 'typeorm'
import { mapSeries } from 'bluebird'
import { Cycle } from 'types'
import { addTokenInfo, addPairInfo } from './createPairUpdater'
import { updateOrAddTxns } from './txHistoryUpdater'
import { ReturningLogFinderResult } from '@terra-money/log-finder'


export async function CreatePairIndexer(
  pairList: Record<string, boolean>,
  tokenList: Record<string, boolean>,
  manager: EntityManager,
  timestamp: string,
  founds: ReturningLogFinderResult<{
    assets: string[]
    pairAddress: string
    lpTokenAddress: string
  }>[]
): Promise<void> {

  // createPair
  await mapSeries(founds, async (logFound) => {
    if (!logFound) return

    const transformed = logFound.transformed

    if (!transformed) return

    addTokenInfo(tokenList, manager, transformed.assets[0], transformed.pairAddress)
    addTokenInfo(tokenList, manager, transformed.assets[1], transformed.pairAddress)
    addPairInfo(pairList, manager, transformed)
    updateOrAddTxns(Cycle.DAY, timestamp, manager, transformed.pairAddress)
    updateOrAddTxns(Cycle.HOUR, timestamp, manager, transformed.pairAddress)
  })
}
