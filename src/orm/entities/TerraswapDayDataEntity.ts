import { Entity, Index, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('terra_swap_day_data')
export class TerraswapDayDataEntity {
  constructor(options: Partial<TerraswapDayDataEntity>) {
    Object.assign(this, options)
  }

  @PrimaryGeneratedColumn()
  id: string

  @Column()
  @Index()
  timestamp: Date

  @Column('decimal', { precision: 40 })
  volumeUst: string

  @Column('decimal', { precision: 40 })
  totalLiquidityUst: string

  @Column()
  txns: number
}
