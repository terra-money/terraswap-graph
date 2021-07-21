import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

@Entity('tx_history')
export class TxHistoryEntity {
  constructor(options: Partial<TxHistoryEntity>) {
    Object.assign(this, options)
  }

  @PrimaryGeneratedColumn()
  id: string

  @Column()
  timestamp: Date

  @Column()
  tx_hash: string

  @Column()
  @Index()
  pair: string

  @Column()
  action: string

  @Column()
  token_0: string

  @Column('decimal', { precision: 40 })
  token_0_amount: string

  @Column()
  token_1: string

  @Column('decimal', { precision: 40 })
  token_1_amount: string
}
