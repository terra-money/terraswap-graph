import { isNative } from 'lib/utils'
import { getContractStore } from './mantle'

interface TokenInfo {
  symbol: string
  decimals: number
}

export async function getTokenInfo(address: string): Promise<TokenInfo | undefined> {
  if (isNative(address)) {
    return {
      symbol: address,
      decimals: 6,
    }
  }

  return getContractStore<TokenInfo>(address, '{"token_info":{}}')
}
