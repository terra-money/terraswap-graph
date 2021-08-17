import { ObjectType, Field } from 'type-graphql'
import { Token } from './Token'

@ObjectType({ simpleResolvers: true })
export class Volume24h {
  @Field()
  token0Volume: string

  @Field()
  token1Volume: string

  @Field()
  volumeUST: string
}

@ObjectType({ simpleResolvers: true })
export class PairData {
  @Field()
  pairAddress: string

  @Field((type) => Token, { nullable: true })
  token0: Token

  @Field((type) => Token, { nullable: true })
  token1: Token

  @Field({ nullable: true })
  latestToken0Price: string

  @Field({ nullable: true })
  latestToken1Price: string

  @Field({ nullable: true })
  latestLiquidityUST: string

  @Field({ nullable: true })
  lpTokenAddress: string

  @Field()
  commissionAPR: string

  @Field((type) => Volume24h, { nullable: true })
  volume24h: Volume24h

  @Field((type) => [Transaction], { nullable: true })
  recentTransactions: Transaction[]

  @Field((type) => [PairHistoricalData], { nullable: true })
  historicalData: PairHistoricalData[]
}

@ObjectType({ simpleResolvers: true })
export class PairHistoricalData {
  @Field()
  timestamp: number

  @Field()
  token0Price: string

  @Field()
  token1Price: string

  @Field()
  token0Volume: string

  @Field()
  token1Volume: string

  @Field()
  token0Reserve: string

  @Field()
  token1Reserve: string

  @Field()
  totalLpTokenShare: string

  @Field()
  volumeUST: string

  @Field()
  liquidityUST: string

  @Field()
  txCount: number
}

@ObjectType({ simpleResolvers: true })
export class Transaction {
  @Field()
  timestamp: number

  @Field()
  txHash: string

  @Field()
  action: string

  @Field()
  token0Amount: string

  @Field()
  token1Amount: string
}
