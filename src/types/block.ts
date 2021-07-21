export interface Block {
  Txs: {
    TxHash: string
    TimestampUTC: number
    Height: number
    Logs: {
      MsgIndex: number
      Log: string
      Events: {
        Type: string
        Attributes: {
          Key: string
          Value: string
        }[]
      }[]
    }[]
    Tx: {
      Msg: {
        Type: string
        Value: string
      }[]
    }
  }[]
}
