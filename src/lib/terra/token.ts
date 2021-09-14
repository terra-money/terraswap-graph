import { ClientError } from 'graphql-request'
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

  const tokenInfo = await getContractStore<TokenInfo>(address, JSON.parse('{"token_info":{}}')).catch(
    (error) => error
  )

  if (tokenInfo instanceof ClientError) {
    if (tokenInfo.response?.status === 200) {
      return undefined
    }

    throw tokenInfo
  } else {
    return tokenInfo
  }
}
