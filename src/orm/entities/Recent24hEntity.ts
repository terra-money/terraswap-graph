import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('recent_24h')
export class Recent24hEntity {
  constructor(options: Partial<Recent24hEntity>) {
    Object.assign(this, options)
  }

  @PrimaryGeneratedColumn()
  id: string

  @Column()
  pair: string

  @Column()
  timestamp: Date

  @Column()
  token_0: string

  @Column('decimal', { precision: 40 })
  token_0_volume: string

  @Column()
  token_1: string

  @Column('decimal', { precision: 40 })
  token_1_volume: string

  @Column('decimal', { precision: 40 })
  volume_ust: string
}
