import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('block')
export class BlockEntity {
  constructor(options: Partial<BlockEntity>) {
    Object.assign(this, options)
  }

  @PrimaryGeneratedColumn()
  id: number

  @Column()
  height: number
}
