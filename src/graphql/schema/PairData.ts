import { ObjectType, Field } from 'type-graphql'
import { Token } from './Token'

@ObjectType({ simpleResolvers: true })
export class PairData {
  @Field()
  pairAddress: string

  @Field((type) => Token)
  token0: Token

  @Field((type) => Token)
  token1: Token

  @Field((type) => [PairHistoricalData])
  historicalData: PairHistoricalData[]
}

@ObjectType({ simpleResolvers: true })
export class PairHistoricalData {
  @Field()
  timestamp: number

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
