import { ObjectType, Field } from 'type-graphql'

@ObjectType({ simpleResolvers: true })
export class Block {
  @Field()
  height: number
}
