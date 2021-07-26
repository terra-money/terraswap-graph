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
  console.log('adding txns on pair_hour, pair_day, terraswap_day')
  await updateOrAddTxns(Cycle.hour, timestamp, manager, pair)
  await updateOrAddTxns(Cycle.day, timestamp, manager, pair)
  await updateOrAddTxnsForTerraswap(timestamp, manager)
}

export async function updateVolume(
  manager: EntityManager,
  transformed: TxHistoryTransformed,
  exchangeRate: ExchangeRate | undefined
): Promise<void> {
  console.log('updating volumne on pair_hour, pair_day, terraswa_day')
  await updatePairVolume(Cycle.hour, manager, transformed, exchangeRate)
  await updatePairVolume(Cycle.day, manager, transformed, exchangeRate)
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
      token_0: isRightOrder ? transformed.assets[0].token : transformed.assets[1].token,
      token_1: isRightOrder ? transformed.assets[1].token : transformed.assets[0].token,
      token_0_volume: isRightOrder
        ? Math.abs(Number(transformed.assets[0].amount)).toString()
        : Math.abs(Number(transformed.assets[1].amount)).toString(),
      token_1_volume: isRightOrder
        ? Math.abs(Number(transformed.assets[1].amount)).toString()
        : Math.abs(Number(transformed.assets[0].amount)).toString(),
      volume_ust: await volumeToUST(manager, new Date(timestamp * 1000), transformed, exchangeRate),
    })
  )
}

export async function addTxHistory(
  manager: EntityManager,
  timestamp: number,
  txHash: string,
  transformed: TxHistoryTransformed
): Promise<TxHistoryEntity> {
  console.log('adding txHistory')

  const txHistoryRepo = manager.getRepository(TxHistoryEntity)

  const isRightOrder = tokenOrderedWell([transformed.assets[0].token, transformed.assets[1].token])

  const txHistory = new TxHistoryEntity({
    timestamp: new Date(timestamp * 1000),
    tx_hash: txHash,
    pair: transformed.pair,
    action: transformed.action,
    token_0: isRightOrder ? transformed.assets[0].token : transformed.assets[1].token,
    token_0_amount: isRightOrder ? transformed.assets[0].amount : transformed.assets[1].amount,
    token_1: isRightOrder ? transformed.assets[1].token : transformed.assets[0].token,
    token_1_amount: isRightOrder ? transformed.assets[1].amount : transformed.assets[0].amount,
  })

  return txHistoryRepo.save(txHistory)
}

export async function updateLpTokenShare(
  cycle: Cycle,
  manager: EntityManager,
  transformed: TxHistoryTransformed
): Promise<PairDataEntity | void> {
  const pairRepo = manager.getRepository(
    cycle === Cycle.hour ? PairHourDataEntity : PairDayDataEntity
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

  lastData.total_lp_token_share = (
    Number(lastData.total_lp_token_share) + Number(shareDiff)
  ).toString()

  return pairRepo.save(lastData)
}

async function updateOrAddTxns(
  cycle: Cycle,
  timestamp: number,
  manager: EntityManager,
  pair: string
): Promise<PairDataEntity | void> {
  const pairRepo = manager.getRepository(
    cycle === Cycle.hour ? PairHourDataEntity : PairDayDataEntity
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
        token_0: pairInfo.token_0,
        token_0_volume: '0',
        token_0_reserve: '0',
        token_1: pairInfo.token_1,
        token_1_volume: '0',
        token_1_reserve: '0',
        total_lp_token_share: '0',
        volume_ust: '0',
        liquidity_ust: '0',
        txns: 1,
      })

      return pairRepo.save(pairData)
    } else {
      const pairData = new PairDataEntity({
        timestamp: txTime,
        pair,
        token_0: lastPairData.token_0,
        token_0_volume: '0',
        token_0_reserve: lastPairData.token_0_reserve,
        token_1: lastPairData.token_1,
        token_1_volume: '0',
        token_1_reserve: lastPairData.token_1_reserve,
        total_lp_token_share: lastPairData.total_lp_token_share,
        volume_ust: '0',
        liquidity_ust: lastPairData.liquidity_ust,
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

  const txTime = numberToDate(timestamp, Cycle.day)

  const isSame = txTime.valueOf() === lastData?.timestamp?.valueOf()

  if (isSame) {
    lastData.txns += 1
    return terraswapRepo.save(lastData)
  } else {
    const terraswapData = new TerraswapDayDataEntity({
      timestamp: txTime,
      volume_ust: '0',
      total_liquidity_ust: lastData === undefined ? '0' : lastData.total_liquidity_ust,
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
    cycle === Cycle.hour ? PairHourDataEntity : PairDayDataEntity
  )

  const pair = transformed.pair

  // must be exist b/c update txns before
  const lastData = await pairRepo.findOne({
    where: [{ pair }],
    order: { timestamp: 'DESC' },
  })

  if (!lastData) return

  const isRightOrder = tokenOrderedWell([transformed.assets[0].token, transformed.assets[1].token])

  lastData.token_0_volume = (
    Number(lastData.token_0_volume) +
    Math.abs(Number(isRightOrder ? transformed.assets[0].amount : transformed.assets[1].amount))
  ).toString()

  lastData.token_1_volume = (
    Number(lastData.token_1_volume) +
    Math.abs(Number(isRightOrder ? transformed.assets[1].amount : transformed.assets[0].amount))
  ).toString()

  const newVolumeUST = await volumeToUST(manager, lastData.timestamp, transformed, exchangeRate)

  lastData.volume_ust = (Number(lastData.volume_ust) + Number(newVolumeUST)).toString()

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

  lastData.volume_ust = (Number(lastData.volume_ust) + Number(newVolumeUST)).toString()

  return terraswapRepo.save(lastData)
}
