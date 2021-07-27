import { ObjectType, Field } from 'type-graphql'
import { Token } from './Token'

@ObjectType({ simpleResolvers: true })
export class ExchangeRate {
  @Field()
  pairAddress: string

  @Field((type) => Token)
  token0: Token

  @Field((type) => Token)
  token1: Token

  @Field((type) => [Price])
  prices: Price[]
}

@ObjectType({ simpleResolvers: true })
export class Price {
  @Field()
  timestamp: number

  @Field()
  token0Price: string

  @Field()
  token1Price: string

  @Field()
  token0Reserve: string

  @Field()
  token1Reserve: string

  @Field()
  liquidityUST: string
}
