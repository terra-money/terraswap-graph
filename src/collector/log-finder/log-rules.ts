interface rule {
  type: string
  attributes: string[][]
}

export function createPairRule(factoryAddress: string): rule {
  return {
    type: 'from_contract',
    attributes: [
      ['contract_address', factoryAddress],
      ['action', 'create_pair'],
      ['pair'],
      ['contract_address'],
      ['liquidity_token_addr'],
    ],
  }
}

export function swapRule(): rule {
  return {
    type: 'from_contract',
    attributes: [
      ['contract_address'],
      ['action', 'swap'],
      ['offer_asset'],
      ['ask_asset'],
      ['offer_amount'],
      ['return_amount'],
      ['tax_amount'],
      ['spread_amount'],
      ['commission_amount'],
    ],
  }
}

export function provideLiquidityRule(): rule {
  return {
    type: 'from_contract',
    attributes: [['contract_address'], ['action', 'provide_liquidity'], ['assets'], ['share']],
  }
}

export function withdrawLiquidityRule(): rule {
  return {
    type: 'from_contract',
    attributes: [
      ['contract_address'],
      ['action', 'withdraw_liquidity'],
      ['withdrawn_share'],
      ['refund_assets'],
    ],
  }
}

export function nonnativeTransferRule(): rule {
  return {
    type: 'from_contract',
    attributes: [['contract_address'], ['action', 'transfer'], ['from'], ['to'], ['amount']],
  }
}

export function nonnativeSendRule(): rule {
  return {
    type: 'from_contract',
    attributes: [['contract_address'], ['action', 'send'], ['from'], ['to'], ['amount']],
  }
}

export function nonnativeTransferRuleFrom(): rule {
  return {
    type: 'from_contract',
    attributes: [
      ['contract_address'],
      ['action', 'transfer_from'],
      ['from'],
      ['to'],
      ['by'],
      ['amount'],
    ],
  }
}

export function nonnativeSendRuleFrom(): rule {
  return {
    type: 'from_contract',
    attributes: [['contract_address'], ['action', 'send_from'], ['from'], ['to'], ['amount']],
  }
}

export function nativeTransferRule(): rule {
  return {
    type: 'transfer',
    attributes: [['recipient'], ['sender'], ['amount']],
  }
}
