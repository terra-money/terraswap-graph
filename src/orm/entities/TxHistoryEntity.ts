import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity('tx_history')
export class TxHistoryEntity {
  constructor(options: Partial<TxHistoryEntity>) {
    Object.assign(this, options)
  }

  @PrimaryGeneratedColumn()
  id: string

  @Column()
  @Index()
  timestamp: Date

  @Column()
  tx_hash: string

  @Column()
  @Index()
  pair: string

  @Column()
  @Index()
  action: string

  @Column()
  token0: string

  @Column('decimal', { precision: 40 })
  token0Amount: string

  @Column()
  token1: string

  @Column('decimal', { precision: 40 })
  token1Amount: string
}
