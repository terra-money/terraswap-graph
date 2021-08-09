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

  let status = 500
  while (500 <= status && status < 600) {
    const tokenInfo = await getContractStore<TokenInfo>(address, '{"token_info":{}}').catch(
      (error) => error
    )

    if (tokenInfo instanceof ClientError) {
      status = tokenInfo.response.status
    } else {
      return tokenInfo
    }
  }

  return
}
