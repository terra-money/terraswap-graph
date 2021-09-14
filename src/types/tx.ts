export interface Tx {
  txhash: string
  timestamp: string
  height: number
  logs: {
    msg_index: number
    events: {
      type: string
      attributes: {
        key: string
        value: string
      }[]
    }[]
  }[]
}
