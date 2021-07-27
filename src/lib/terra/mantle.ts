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

export async function getContractStore<T>(address: string, query: string): Promise<T | undefined> {
  const response = await mantle.request(
    gql`
      query ($address: String!, $query: String!) {
        WasmContractsContractAddressStore(ContractAddress: $address, QueryMsg: $query) {
          Height
          Result
        }
      }
    `,
    {
      address,
      query,
    }
  )

  if (!response?.WasmContractsContractAddressStore?.Result) {
    return undefined
  }

  return JSON.parse(response.WasmContractsContractAddressStore.Result)
}
