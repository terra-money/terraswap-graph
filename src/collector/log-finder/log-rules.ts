import { LogFinderRule } from '@terra-money/log-finder'

export function createPairRule(factoryAddress: string): LogFinderRule {
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

export function swapRule(): LogFinderRule {
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

export function provideLiquidityRule(): LogFinderRule {
  return {
    type: 'from_contract',
    attributes: [['contract_address'], ['action', 'provide_liquidity'], ['assets'], ['share']],
  }
}

export function withdrawLiquidityRule(): LogFinderRule {
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

export function nonnativeTransferRule(): LogFinderRule {
  return {
    type: 'from_contract',
    attributes: [
      ['contract_address'],
      ['action', (value) => value == 'transfer' || value == 'send'],
      ['from'],
      ['to'],
      ['amount'],
    ],
  }
}

export function nonnativeTransferRuleFrom(): LogFinderRule {
  return {
    type: 'from_contract',
    attributes: [
      ['contract_address'],
      ['action', (value) => value == 'transfer_from' || value == 'send_from'],
      ['from'],
      ['to'],
      ['by'],
      ['amount'],
    ],
  }
}

export function nativeTransferRule(): LogFinderRule {
  return {
    type: 'transfer',
    attributes: [['recipient'], ['sender'], ['amount']],
  }
}
