import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class Token {
  @Field()
  tokenAddress: string

  @Field()
  symbol: string

  @Field((type) => [String])
  includedPairs: string[]
}
