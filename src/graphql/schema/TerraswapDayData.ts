import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class TerraswapDay {
  @Field()
  timestamp: number

  @Field()
  volumeUST: string

  @Field()
  liquidityUST: string

  @Field()
  txCount: number
}
