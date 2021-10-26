import { EntityManager } from 'typeorm'
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
  for (const logFound of founds) {
    if (!logFound) return

    const transformed = logFound.transformed

    if (!transformed) return

    await addTokenInfo(tokenList, manager, transformed.assets[0], transformed.pairAddress)
    await addTokenInfo(tokenList, manager, transformed.assets[1], transformed.pairAddress)
    await addPairInfo(pairList, manager, transformed)
    await updateOrAddTxns(Cycle.DAY, timestamp, manager, transformed.pairAddress)
    await updateOrAddTxns(Cycle.HOUR, timestamp, manager, transformed.pairAddress)
  }
}
