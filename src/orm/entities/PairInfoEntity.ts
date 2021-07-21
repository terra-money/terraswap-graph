import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('pair_info')
export class PairInfoEntity {
  constructor(options: Partial<PairInfoEntity>) {
    Object.assign(this, options)
  }

  @PrimaryColumn()
  pair: string

  @Column()
  token_0: string

  @Column()
  token_1: string

  @Column()
  lp_token: string
}
