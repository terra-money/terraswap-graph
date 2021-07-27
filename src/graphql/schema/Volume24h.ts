import { ObjectType, Field } from 'type-graphql'
import { Token } from './Token'

@ObjectType({ simpleResolvers: true })
export class Volume24h {
  @Field()
  pairAddress: string

  @Field((type) => Token)
  token0: Token

  @Field((type) => Token)
  token1: Token

  @Field()
  token0Volume: string

  @Field()
  token1Volume: string

  @Field()
  volumeUST: string
}
