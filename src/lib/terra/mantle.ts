import { GraphQLClient, gql } from 'graphql-request'
import * as logger from 'lib/logger'

export let mantle: GraphQLClient

export function initMantle(URL: string): GraphQLClient {
  logger.info('Initialize mantle')

  mantle = new GraphQLClient(URL, {
    timeout: 60000,
    keepalive: true,
  })

  return mantle
}

export async function getContractStore<T>(address: string, query: JSON): Promise<T | undefined> {
  const response = await mantle.request(
    gql`
      query ($address: String!, $query: JSON!) {
        wasm{
          contractQuery(contractAddress: $address, query: $query) 
        }
      }
    `,
    {
      address,
      query,
    }
  )

  if (!response?.wasm?.contractQuery) {
    return undefined
  }

  return response.wasm.contractQuery
}
