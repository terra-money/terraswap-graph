import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('exchange_rate')
export class ExchangeRateEntity {
  constructor(options: Partial<ExchangeRateEntity>) {
    Object.assign(this, options)
  }

  @PrimaryGeneratedColumn()
  id: string

  @Column()
  timestamp: Date

  @Column()
  pair: string

  @Column()
  token_0: string

  @Column()
  token_1: string

  @Column('decimal', { precision: 40, scale: 10 })
  token_0_price: string

  @Column('decimal', { precision: 40, scale: 10 })
  token_1_price: string

  @Column('decimal', { precision: 40 })
  token_0_reserve: string

  @Column('decimal', { precision: 40 })
  token_1_reserve: string

  @Column('decimal', { precision: 40 })
  liquidity_ust: string
}
