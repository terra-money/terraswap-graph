import { LogFinderRule } from '@terra-money/log-finder'

export function createPairRule(factoryAddress: string): LogFinderRule {
  return {
    type: 'wasm',
    attributes: [
      ['contract_address', factoryAddress],
      ['action', 'create_pair'],
      ['pair'],
      ['contract_address'],
      ['liquidity_token_addr'],
    ],
  }
}

// swap, provide and withdraw rule
export function spwRule(): LogFinderRule {
  return {
    type: 'wasm',
    attributes: [
      ['contract_address'],
      [
        'action',
        (value) => value === 'swap' || value === 'provide_liquidity' || value === 'withdraw_liquidity',
      ],
    ],
    matchUntil: 'contract_address',
  }
}

export function nonnativeTransferRule(): LogFinderRule {
  return {
    type: 'wasm',
    attributes: [
      ['contract_address'],
      [
        'action',
        (value) =>
          value === 'transfer' ||
          value === 'send' ||
          value === 'transfer_from' ||
          value === 'send_from',
      ],
    ],
    matchUntil: 'contract_address',
  }
}

export function nonnativeTransferRuleFrom(): LogFinderRule {
  return {
    type: 'wasm',
    attributes: [
      ['contract_address'],
      ['action', (value) => value === 'transfer_from' || value === 'send_from'],
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
