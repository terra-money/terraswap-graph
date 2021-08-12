import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class TerraswapData {

  @Field()
  volumeUST24h: string

  @Field()
  liquidityUST: string

  @Field((type) => [TerraswapHistoricalData])
  historicalData: TerraswapHistoricalData[]
}

@ObjectType({ simpleResolvers: true })
export class TerraswapHistoricalData {
  @Field()
  timestamp: number

  @Field()
  volumeUST: string

  @Field()
  liquidityUST: string

  @Field()
  txCount: number
}
