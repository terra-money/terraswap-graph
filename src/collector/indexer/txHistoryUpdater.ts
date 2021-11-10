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
import { isNative, addMinus, stringToDate, isTokenOrderedWell, compareLiquidity } from 'lib/utils'
import { getTokenPriceAsUST } from './common'
import { num } from 'lib/num'

export async function updateTxns(
  timestamp: string,
  manager: EntityManager,
  pair: string
): Promise<void> {
  await updateOrAddTxns(Cycle.HOUR, timestamp, manager, pair)
  await updateOrAddTxns(Cycle.DAY, timestamp, manager, pair)
}

export async function updateVolume(
  manager: EntityManager,
  transformed: TxHistoryTransformed,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  await updatePairVolume(Cycle.HOUR, manager, transformed, exchangeRate)
  await updatePairVolume(Cycle.DAY, manager, transformed, exchangeRate)
}

export async function updateVolume24h(
  manager: EntityManager,
  transformed: TxHistoryTransformed,
  timestamp: string,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  const recent24hRepo = manager.getRepository(Recent24hEntity)

  const isRightOrder = isTokenOrderedWell([
    transformed.assets[0].token,
    transformed.assets[1].token,
  ])
  await recent24hRepo.save(
    new Recent24hEntity({
      pair: transformed.pair,
      timestamp: new Date(timestamp),
      token0: isRightOrder ? transformed.assets[0].token : transformed.assets[1].token,
      token1: isRightOrder ? transformed.assets[1].token : transformed.assets[0].token,
      token0Volume: isRightOrder
        ? Math.abs(Number(transformed.assets[0].amount)).toString()
        : Math.abs(Number(transformed.assets[1].amount)).toString(),
      token1Volume: isRightOrder
        ? Math.abs(Number(transformed.assets[1].amount)).toString()
        : Math.abs(Number(transformed.assets[0].amount)).toString(),
      volumeUst: await changeVolumeAsUST(
        manager,
        new Date(timestamp),
        transformed,
        exchangeRate
      ),
    })
  )
}

export async function addTxHistory(
  manager: EntityManager,
  timestamp: string,
  txHash: string,
  transformed: TxHistoryTransformed
): Promise<TxHistoryEntity> {
  const txHistoryRepo = manager.getRepository(TxHistoryEntity)

  const isRightOrder = isTokenOrderedWell([
    transformed.assets[0].token,
    transformed.assets[1].token,
  ])

  const txHistory = new TxHistoryEntity({
    timestamp: new Date(timestamp),
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

export async function updateOrAddTxns(
  cycle: Cycle,
  timestamp: string,
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

  const txTime = stringToDate(timestamp, cycle)

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

export async function generateTerraswapRow(
  timestamp: string,
  manager: EntityManager
): Promise<TerraswapDayDataEntity | void> {
  const terraswapRepo = manager.getRepository(TerraswapDayDataEntity)

  const lastData = await terraswapRepo.findOne({
    order: { timestamp: 'DESC' },
  })

  const txTime = stringToDate(timestamp, Cycle.DAY)

  const isSame = txTime.valueOf() === lastData?.timestamp?.valueOf()

  if (!isSame) {
    const terraswapData = new TerraswapDayDataEntity({
      timestamp: txTime,
      volumeUst: '0',
      totalLiquidityUst: lastData === undefined ? '0' : lastData.totalLiquidityUst,
      txns: 0,
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

  const isRightOrder = isTokenOrderedWell([
    transformed.assets[0].token,
    transformed.assets[1].token,
  ])

  lastData.token0Volume = (
    Number(lastData.token0Volume) +
    Math.abs(Number(isRightOrder ? transformed.assets[0].amount : transformed.assets[1].amount))
  ).toString()

  lastData.token1Volume = (
    Number(lastData.token1Volume) +
    Math.abs(Number(isRightOrder ? transformed.assets[1].amount : transformed.assets[0].amount))
  ).toString()

  const newVolumeUST = await changeVolumeAsUST(
    manager,
    lastData.timestamp,
    transformed,
    exchangeRate
  )

  lastData.volumeUst = (Number(lastData.volumeUst) + Number(newVolumeUST)).toString()

  return pairRepo.save(lastData)
}

async function changeVolumeAsUST(
  manager: EntityManager,
  timestamp: Date,
  transformed: TxHistoryTransformed,
  exchangeRate: ExchangeRate | undefined
): Promise<string> {
  //case1. uusd exist
  if (transformed.assets[0].token === 'uusd' || transformed.assets[1].token === 'uusd') {
    return transformed.assets[0].token === 'uusd'
      ? Math.abs(Number(transformed.assets[0].amount)).toString()
      : Math.abs(Number(transformed.assets[1].amount)).toString()
  }

  //case2. both are native: use asset0
  else if (isNative(transformed.assets[0].token) && isNative(transformed.assets[1].token)) {
    const token0Price = await getTokenPriceAsUST(
      manager,
      transformed.assets[0].token,
      timestamp,
      exchangeRate
    )

    return num(token0Price.price).multipliedBy(transformed.assets[0].amount).abs().toString()
  }

  //case3. only one is native
  else if (isNative(transformed.assets[0].token) || isNative(transformed.assets[1].token)) {
    const nativeTokenIndex = isNative(transformed.assets[0].token) ? 0 : 1

    const tokenPrice = await getTokenPriceAsUST(
      manager,
      transformed.assets[nativeTokenIndex].token,
      timestamp,
      exchangeRate
    )

    return num(tokenPrice.price)
      .multipliedBy(transformed.assets[nativeTokenIndex].amount)
      .abs()
      .toString()
  }

  //case4. both are non-native
  else {
    const token0Price = await getTokenPriceAsUST(
      manager,
      transformed.assets[0].token,
      timestamp,
      exchangeRate
    )

    const token1Price = await getTokenPriceAsUST(
      manager,
      transformed.assets[1].token,
      timestamp,
      exchangeRate
    )

    return compareLiquidity(token0Price.liquidity, token1Price.liquidity)
      ? num(token0Price.price).multipliedBy(transformed.assets[0].amount).abs().toString()
      : num(token1Price.price).multipliedBy(transformed.assets[1].amount).abs().toString()
  }
}
