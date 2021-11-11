import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class Token {
  @Field()
  tokenAddress: string

  @Field({ nullable: true })
  symbol: string

  @Field((type) => [String], { nullable: true })
  includedPairs: string[]

  @Field({ nullable: true })
  decimals: number
}
