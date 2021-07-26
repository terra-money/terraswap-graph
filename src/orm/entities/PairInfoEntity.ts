import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('pair_info')
export class PairInfoEntity {
  constructor(options: Partial<PairInfoEntity>) {
    Object.assign(this, options)
  }

  @PrimaryColumn()
  pair: string

  @Column()
  token0: string

  @Column()
  token1: string

  @Column()
  lpToken: string
}
