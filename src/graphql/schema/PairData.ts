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

  @Field((type) => Token)
  token0: Token

  @Field((type) => Token)
  token1: Token

  @Field()
  latestToken0Price: string

  @Field()
  latestToken1Price: string

  @Field()
  commissionAPR: string

  @Field((type) => Volume24h)
  volume24h: Volume24h

  @Field((type) => [PairHistoricalData])
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
