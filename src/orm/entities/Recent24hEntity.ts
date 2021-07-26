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
  token0: string

  @Column('decimal', { precision: 40 })
  token0Volume: string

  @Column()
  token1: string

  @Column('decimal', { precision: 40 })
  token1Volume: string

  @Column('decimal', { precision: 40 })
  volumeUst: string
}
