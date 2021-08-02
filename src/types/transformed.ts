export interface Asset {
  token: string
  amount: string
}

export interface TxHistoryTransformed {
  pair: string
  action: string
  assets: Asset[]
  share: string
}

export interface createPairTransformed {
  assets: string[]
  pairAddress: string
  lpTokenAddress: string
}
export interface TransferTransformed {
  pairAddress: string
  assets: {
    token: string
    amount: string
  }
}

export interface NativeTransferTransformed {
  recipient: string
  sender: string
  assets: {
    token: string
    amount: string
  }
}

export interface NonnativeTransferTransformed {
  addresses: {
    from: string
    to: string
  }
  assets: {
    token: string
    amount: string
  }
}
