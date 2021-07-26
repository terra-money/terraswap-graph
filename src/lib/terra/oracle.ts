import { gql } from 'graphql-request'
import { mantle } from './mantle'

interface ExchangeRate {
  Height: string
  Result: {
    Denom: string
    Amount: string
  }[]
}

export async function oracleExchangeRate(): Promise<ExchangeRate | undefined> {
  const response = await mantle.request(
    gql`
      query {
        OracleDenomsExchangeRates {
          Height
          Result {
            Amount
            Denom
          }
        }
      }
    `
  )
  if (!response?.OracleDenomsExchangeRates?.Result) {
    return undefined
  }
  return response.OracleDenomsExchangeRates
}

export async function exchangeRateToUST(
  denom: string,
  exchangeRate: ExchangeRate | undefined
): Promise<string | undefined> {
  if (!exchangeRate) return
  if (denom === 'uluna') return exchangeRate.Result.filter((e) => e.Denom === 'uusd')[0].Amount
  if (denom === 'uusd') return '1'
  const uusdRate = exchangeRate.Result.filter((e) => e.Denom === 'uusd')[0].Amount
  const targetDenomRate = exchangeRate.Result.filter((e) => e.Denom === denom)[0].Amount
  return (Number(uusdRate) / Number(targetDenomRate)).toString()
}
