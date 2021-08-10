import { BigNumber } from 'bignumber.js'

BigNumber.config({
  DECIMAL_PLACES: 10,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
})

export function num(number: number | string): BigNumber {
  return new BigNumber(number)
}

export * from 'bignumber.js'
