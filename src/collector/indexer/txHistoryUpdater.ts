import { EntityManager } from 'typeorm'
import {
  PairHourDataEntity,
  PairDayDataEntity,
  TerraswapDayDataEntity,
  PairDataEntity,
  PairInfoEntity,
  TxHistoryEntity,
  Recent24hEntity,
} from 'orm'
import { Cycle, ExchangeRate, TxHistoryTransformed } from 'types'
import { addMinus, numberToDate, tokenOrderedWell } from 'lib/utils'
import { tokenPriceAsUST } from './common'

export async function updateTxns(
  timestamp: number,
  manager: EntityManager,
  pair: string
): Promise<void> {
  await updateOrAddTxns(Cycle.HOUR, timestamp, manager, pair)
  await updateOrAddTxns(Cycle.DAY, timestamp, manager, pair)
  await updateOrAddTxnsForTerraswap(timestamp, manager)
}

export async function updateVolume(
  manager: EntityManager,
  transformed: TxHistoryTransformed,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  await updatePairVolume(Cycle.HOUR, manager, transformed, exchangeRate)
  await updatePairVolume(Cycle.DAY, manager, transformed, exchangeRate)
  await updateTerraswapVolume(manager, transformed, exchangeRate)
}

export async function updateVolume24h(
  manager: EntityManager,
  transformed: TxHistoryTransformed,
  timestamp: number,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  const recent24hRepo = manager.getRepository(Recent24hEntity)

  const isRightOrder = tokenOrderedWell([transformed.assets[0].token, transformed.assets[1].token])
  await recent24hRepo.save(
    new Recent24hEntity({
      pair: transformed.pair,
      timestamp: new Date(timestamp * 1000),
      token0: isRightOrder ? transformed.assets[0].token : transformed.assets[1].token,
      token1: isRightOrder ? transformed.assets[1].token : transformed.assets[0].token,
      token0Volume: isRightOrder
        ? Math.abs(Number(transformed.assets[0].amount)).toString()
        : Math.abs(Number(transformed.assets[1].amount)).toString(),
      token1Volume: isRightOrder
        ? Math.abs(Number(transformed.assets[1].amount)).toString()
        : Math.abs(Number(transformed.assets[0].amount)).toString(),
      volumeUst: await volumeToUST(manager, new Date(timestamp * 1000), transformed, exchangeRate),
    })
  )
}

export async function addTxHistory(
  manager: EntityManager,
  timestamp: number,
  txHash: string,
  transformed: TxHistoryTransformed
): Promise<TxHistoryEntity> {
  const txHistoryRepo = manager.getRepository(TxHistoryEntity)

  const isRightOrder = tokenOrderedWell([transformed.assets[0].token, transformed.assets[1].token])

  const txHistory = new TxHistoryEntity({
    timestamp: new Date(timestamp * 1000),
    tx_hash: txHash,
    pair: transformed.pair,
    action: transformed.action,
    token0: isRightOrder ? transformed.assets[0].token : transformed.assets[1].token,
    token0Amount: isRightOrder ? transformed.assets[0].amount : transformed.assets[1].amount,
    token1: isRightOrder ? transformed.assets[1].token : transformed.assets[0].token,
    token1Amount: isRightOrder ? transformed.assets[1].amount : transformed.assets[0].amount,
  })

  return txHistoryRepo.save(txHistory)
}

export async function updateLpTokenShare(
  cycle: Cycle,
  manager: EntityManager,
  transformed: TxHistoryTransformed
): Promise<PairDataEntity | void> {
  const pairRepo = manager.getRepository(
    cycle === Cycle.HOUR ? PairHourDataEntity : PairDayDataEntity
  )

  const pair = transformed.pair

  // must be exist b/c update txns before
  const lastData = await pairRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  let shareDiff = transformed.share

  if (transformed.action === 'withdraw_liquidity') shareDiff = addMinus(shareDiff)

  if (!lastData) return

  lastData.totalLpTokenShare = (Number(lastData.totalLpTokenShare) + Number(shareDiff)).toString()

  return pairRepo.save(lastData)
}

async function updateOrAddTxns(
  cycle: Cycle,
  timestamp: number,
  manager: EntityManager,
  pair: string
): Promise<PairDataEntity | void> {
  const pairRepo = manager.getRepository(
    cycle === Cycle.HOUR ? PairHourDataEntity : PairDayDataEntity
  )

  const lastPairData = await pairRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  const txTime = numberToDate(timestamp, cycle)

  const isSame = txTime.valueOf() === lastPairData?.timestamp?.valueOf()

  if (isSame) {
    lastPairData.txns += 1
    return pairRepo.save(lastPairData)
  } else {
    if (lastPairData === undefined) {
      const pairInfoRepo = manager.getRepository(PairInfoEntity)

      const pairInfo = await pairInfoRepo.findOne({
        where: [{ pair }],
      })

      if (!pairInfo) return

      const pairData = new PairDayDataEntity({
        timestamp: txTime,
        pair,
        token0: pairInfo.token0,
        token0Volume: '0',
        token0Reserve: '0',
        token1: pairInfo.token1,
        token1Volume: '0',
        token1Reserve: '0',
        totalLpTokenShare: '0',
        volumeUst: '0',
        liquidityUst: '0',
        txns: 1,
      })

      return pairRepo.save(pairData)
    } else {
      const pairData = new PairDataEntity({
        timestamp: txTime,
        pair,
        token0: lastPairData.token0,
        token0Volume: '0',
        token0Reserve: lastPairData.token0Reserve,
        token1: lastPairData.token1,
        token1Volume: '0',
        token1Reserve: lastPairData.token1Reserve,
        totalLpTokenShare: lastPairData.totalLpTokenShare,
        volumeUst: '0',
        liquidityUst: lastPairData.liquidityUst,
        txns: 1,
      })

      return pairRepo.save(pairData)
    }
  }
}

async function updateOrAddTxnsForTerraswap(
  timestamp: number,
  manager: EntityManager
): Promise<TerraswapDayDataEntity | void> {
  const terraswapRepo = manager.getRepository(TerraswapDayDataEntity)

  const lastData = await terraswapRepo.findOne({
    order: { timestamp: 'DESC' },
  })

  const txTime = numberToDate(timestamp, Cycle.DAY)

  const isSame = txTime.valueOf() === lastData?.timestamp?.valueOf()

  if (isSame) {
    lastData.txns += 1
    return terraswapRepo.save(lastData)
  } else {
    const terraswapData = new TerraswapDayDataEntity({
      timestamp: txTime,
      volumeUst: '0',
      totalLiquidityUst: lastData === undefined ? '0' : lastData.totalLiquidityUst,
      txns: 1,
    })
    return terraswapRepo.save(terraswapData)
  }
}

async function updatePairVolume(
  cycle: Cycle,
  manager: EntityManager,
  transformed: TxHistoryTransformed,
  exchangeRate: ExchangeRate | undefined
): Promise<PairDataEntity | void> {
  const pairRepo = manager.getRepository(
    cycle === Cycle.HOUR ? PairHourDataEntity : PairDayDataEntity
  )

  const pair = transformed.pair

  // must be exist b/c update txns before
  const lastData = await pairRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  if (!lastData) return

  const isRightOrder = tokenOrderedWell([transformed.assets[0].token, transformed.assets[1].token])

  lastData.token0Volume = (
    Number(lastData.token0Volume) +
    Math.abs(Number(isRightOrder ? transformed.assets[0].amount : transformed.assets[1].amount))
  ).toString()

  lastData.token1Volume = (
    Number(lastData.token1Volume) +
    Math.abs(Number(isRightOrder ? transformed.assets[1].amount : transformed.assets[0].amount))
  ).toString()

  const newVolumeUST = await volumeToUST(manager, lastData.timestamp, transformed, exchangeRate)

  lastData.volumeUst = (Number(lastData.volumeUst) + Number(newVolumeUST)).toString()

  return pairRepo.save(lastData)
}

async function volumeToUST(
  manager: EntityManager,
  timestamp: Date,
  transformed: TxHistoryTransformed,
  exchangeRate: ExchangeRate | undefined
): Promise<string> {
  const token0Price = await tokenPriceAsUST(
    manager,
    transformed.assets[0].token,
    timestamp,
    exchangeRate
  )

  const token1Price = await tokenPriceAsUST(
    manager,
    transformed.assets[1].token,
    timestamp,
    exchangeRate
  )

  return liquidityCompare(token0Price.liquidity, token1Price.liquidity)
    ? Math.abs(Number(token0Price.price) * Number(transformed.assets[0].amount)).toString()
    : Math.abs(Number(token1Price.price) * Number(transformed.assets[1].amount)).toString()
}

async function liquidityCompare(liquidity0: string, liquidity1: string) {
  if (liquidity0 === 'native') return true
  if (liquidity1 === 'native') return false
  return Number(liquidity0) > Number(liquidity1)
}

async function updateTerraswapVolume(
  manager: EntityManager,
  transformed: TxHistoryTransformed,
  exchangeRate: ExchangeRate | undefined
): Promise<TerraswapDayDataEntity | void> {
  const terraswapRepo = manager.getRepository(TerraswapDayDataEntity)

  const lastData = await terraswapRepo.findOne({
    order: { timestamp: 'DESC' },
  })

  if (!lastData) return

  const newVolumeUST = await volumeToUST(manager, lastData.timestamp, transformed, exchangeRate)

  lastData.volumeUst = (Number(lastData.volumeUst) + Number(newVolumeUST)).toString()

  return terraswapRepo.save(lastData)
}
