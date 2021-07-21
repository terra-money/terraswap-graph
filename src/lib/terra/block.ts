import { gql } from 'graphql-request'
import { Block } from 'types'
import { mantle } from './mantle'

export async function getBlock(start: number, end: number, limit = 100): Promise<Block[]> {
  const response = await mantle.request(
    gql`
      query ($range: [Int!]!, $limit: Int!) {
        Blocks(Height_range: $range, Limit: $limit, Order: ASC) {
          Txs {
            Height
            TxHash
            TimestampUTC
            Logs {
              Events {
                Type
                Attributes {
                  Key
                  Value
                }
              }
            }
            Tx {
              Msg {
                Type
                Value
              }
            }
          }
        }
      }
    `,
    {
      range: [start, end],
      limit,
    }
  )

  return response?.Blocks
}

export async function getLatestBlock(): Promise<number> {
  const response = await mantle.request(
    gql`
      {
        LastSyncedHeight
      }
    `
  )
  return response?.LastSyncedHeight
}
