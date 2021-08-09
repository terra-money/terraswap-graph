import { delay } from 'bluebird'
import fetch from 'node-fetch'
import { ExchangeRate } from 'types'

async function getFromLCD(leftover: string, baseURL = 'https://lcd.terra.dev/') {
  let getted = false
  while (!getted) {
    try {
      const res = await fetch(baseURL + leftover, {
        headers: {
          accept: 'application/json',
        },
      }).catch()
      getted = true
      return res.json()
    } catch (error) {
      console.log(error)
      delay(1000)
    }
  }
}

export async function getOracleExchangeRate(block: number): Promise<ExchangeRate> {
  let res = await getFromLCD('oracle/denoms/exchange_rates?height=' + block.toString())
  if (res && res.reulst == null) {
    let index = 1
    while (res.result == null) {
      res = await getFromLCD(
        'oracle/denoms/exchange_rates?height=' + (block - index * 100).toString()
      )
      index++
    }
  }
  return res
}

export async function exchangeRateToUST(
  denom: string,
  inputExchangeRate: ExchangeRate | undefined
): Promise<string | undefined> {
  let exchangeRate = inputExchangeRate
  if (!exchangeRate) return
  if (denom === 'uluna') return exchangeRate.result.filter((e) => e.denom === 'uusd')[0].amount
  if (!exchangeRate.result.filter((e) => e.denom === denom)[0]) {
    while (!exchangeRate.result.filter((e) => e.denom === denom)[0]) {
      exchangeRate = await getOracleExchangeRate(Number(exchangeRate.height) - 100)
    }
  }
  if (denom === 'uusd') return '1'
  const uusdRate = exchangeRate.result.filter((e) => e.denom === 'uusd')[0].amount
  const targetDenomRate = exchangeRate.result.filter((e) => e.denom === denom)[0].amount
  return (Number(uusdRate) / Number(targetDenomRate)).toString()
}
