import { registerEnumType } from 'type-graphql'

export enum Cycle {
  DAY = 86400000,
  HOUR = 3600000,
  MINUTE = 60000,
}

export enum Interval {
  DAY = Cycle.DAY,
  HOUR = Cycle.HOUR,
}

registerEnumType(Interval, { name: 'Interval' })
