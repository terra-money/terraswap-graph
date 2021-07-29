import { ObjectType, Field } from 'type-graphql'
import { Token } from './Token'

@ObjectType({ simpleResolvers: true })
export class Pair {
  @Field()
  pairAddress: string

  @Field((type) => Token)
  token0: Token

  @Field((type) => Token)
  token1: Token

  @Field()
  lpTokenAddress: string
}
