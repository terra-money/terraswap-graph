import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('token_info')
export class TokenInfoEntity {
  constructor(options: Partial<TokenInfoEntity>) {
    Object.assign(this, options)
  }

  @PrimaryColumn()
  token_address: string

  @Column()
  symbol: string

  @Column('simple-array')
  pairs: string[]

  @Column()
  decimals: number
}
