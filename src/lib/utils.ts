import { Cycle } from 'types'

interface AssetInfo {
  token: string
  amount: string
}

export function addMinus(n: string): string {
  return '-' + n
}

export function trimAssets(rawAssets: string, inflow: boolean): AssetInfo[] {
  const assets = rawAssets.split(',').map((e) => e.trim())
  return assets
    .map((e) => {
      const assetsInfo = {
        token: e.slice(e.search(/[a-z]/), e.length), // asset
        amount: (inflow ? '' : '-') + e.slice(0, e.search(/[a-z]/)), // amount
      }
      return assetsInfo
    })
    .flat()
}

export function isNative(token: string): boolean {
  return token.slice(0, 6) != 'terra1'
}

const tokenOrder = ['uluna', 'uusd', 'ukrw']

export function isTokenOrderedWell(tokens: string[]): boolean {
  const token0 = tokens[0]
  const token1 = tokens[1]
  for (const token of tokenOrder) {
    if (token === token0) {
      return true
    } else if (token === token1) return false
  }
  // if both native
  if (isNative(token0) && isNative(token1)) return token0 < token1
  // single native
  if (isNative(token0) || isNative(token1)) return isNative(token0)

  return token0 < token1
}

export function numberToDate(timestamp: number, cycle: number): Date {
  return new Date(timestamp * 1000 - ((timestamp * 1000) % cycle))
}

export function stringToDate(timestamp: string, cycle: number): Date {
  const timestampNumber = new Date(timestamp).valueOf() 
  return new Date(timestampNumber- (timestampNumber % cycle))
}

export function dateToNumber(timestamp: Date): number {
  const stringTime = (timestamp.valueOf() / 1000).toFixed(0)
  return parseInt(stringTime)
}

export function floorDate(timestamp: number, cycle: number): number {
  return timestamp - timestamp % (cycle / 1000)
}

export function compareLiquidity(liquidity0: string, liquidity1: string): boolean {
  if (liquidity0 === 'native') return true
  if (liquidity1 === 'native') return false
  return Number(liquidity0) > Number(liquidity1)
}

export function rangeLimit(from: number, to: number, cycle: Cycle, limit: number): void {
  if ((to - from) / (cycle / 1000) > limit)
    throw new Error(`max limit is '${limit}' set your range narrower or set larger interval`)
}
