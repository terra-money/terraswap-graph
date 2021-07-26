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
  token0: string

  @Column()
  token1: string

  @Column('decimal', { precision: 40, scale: 10 })
  token0Price: string

  @Column('decimal', { precision: 40, scale: 10 })
  token1Price: string

  @Column('decimal', { precision: 40 })
  token0Reserve: string

  @Column('decimal', { precision: 40 })
  token1Reserve: string

  @Column('decimal', { precision: 40 })
  liquidityUst: string
}
