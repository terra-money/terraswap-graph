import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('terra_swap_day_data')
export class TerraswapDayDataEntity {
  constructor(options: Partial<TerraswapDayDataEntity>) {
    Object.assign(this, options)
  }

  @PrimaryGeneratedColumn()
  id: string

  @Column()
  timestamp: Date

  @Column('decimal', { precision: 40 })
  volume_ust: string

  @Column('decimal', { precision: 40 })
  total_liquidity_ust: string

  @Column()
  txns: number
}
