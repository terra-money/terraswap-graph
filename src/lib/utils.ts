interface AssetInfo {
  token: string
  amount: string
}

export function addMinus(n: string): string {
  return '-' + n
}

export function assetsTrimer(rawAssets: string, inflow: boolean): AssetInfo[] {
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
  return token.search(/terra1/) !== 0
}

const tokenOrder = ['uluna', 'uusd', 'ukrw']

export function tokenOrderedWell(tokens: string[]): boolean {
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

export function dateToNumber(timestamp: Date): number {
  const stringTime = (timestamp.valueOf() / 1000).toFixed(0)
  return parseInt(stringTime)
}

export function liquidityCompare(liquidity0: string, liquidity1: string): boolean {
  if (liquidity0 === 'native') return true
  if (liquidity1 === 'native') return false
  return Number(liquidity0) > Number(liquidity1)
}

export function addressMatch(value: string, addressList: string[]): boolean {
  for (const address of addressList) {
    if (address == value) return true
  }
}
