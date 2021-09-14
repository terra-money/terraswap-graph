import { gql } from 'graphql-request'
import { Tx } from 'types'
import { mantle } from './mantle'

export async function getBlock(height: number): Promise<Tx[]> {
  const response = await mantle.request(
    gql`
      query ($height: Float!) {
        tx {
          byHeight(height: $height) {
            timestamp
            height
            txhash
            logs {
              msg_index
              events{
                type
                attributes {
                  key
                  value
                }
              }
            }
          }
        }
      }
    `,
    { height }
  )

  return response?.tx?.byHeight
}

export async function getLatestBlock(): Promise<number> {
  const response = await mantle.request(
    gql`
      {
        tendermint {
          blockInfo {
            block {
              header {
                height
              }
            }
          }
        }
      }
    `
  )
  return Number(response?.tendermint?.blockInfo?.block?.header?.height)
}
