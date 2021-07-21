import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

export class PairDataEntity {
  constructor(options: Partial<PairDataEntity>) {
    Object.assign(this, options)
  }

  @PrimaryGeneratedColumn()
  id: string

  @Column()
  timestamp: Date

  @Column()
  @Index()
  pair: string

  @Column()
  token_0: string

  @Column('decimal', { precision: 40 })
  token_0_volume: string

  @Column('decimal', { precision: 40 })
  token_0_reserve: string

  @Column()
  token_1: string

  @Column('decimal', { precision: 40 })
  token_1_volume: string

  @Column('decimal', { precision: 40 })
  token_1_reserve: string

  @Column('decimal', { precision: 40 })
  total_lp_token_share: string

  @Column('decimal', { precision: 40 })
  volume_ust: string

  @Column('decimal', { precision: 40 })
  liquidity_ust: string

  @Column()
  txns: number
}

@Entity('pair_day_data')
export class PairDayDataEntity extends PairDataEntity {}

@Entity('pair_hour_data')
export class PairHourDataEntity extends PairDataEntity {}
