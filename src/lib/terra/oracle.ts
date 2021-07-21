import { gql } from 'graphql-request'
import { delay } from 'bluebird'
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

export async function exchangeRateToUST(denom: string): Promise<string | undefined> {
  let getted = false
  let exchangeRate
  while (!getted) {
    exchangeRate = await oracleExchangeRate().catch((err) => {
      console.log(err)
    })
    !exchangeRate || !exchangeRate?.Result ? await delay(1000) : (getted = true)
  }
  if (!exchangeRate) return
  if (denom === 'uluna') return exchangeRate.Result.filter((e) => e.Denom === 'uusd')[0].Amount
  if (denom === 'uusd') return '1'
  const uusdRate = exchangeRate.Result.filter((e) => e.Denom === 'uusd')[0].Amount
  const targetDenomRate = exchangeRate.Result.filter((e) => e.Denom === denom)[0].Amount
  return (Number(uusdRate) / Number(targetDenomRate)).toString()
}
