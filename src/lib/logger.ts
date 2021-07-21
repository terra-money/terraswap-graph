import { formatToTimeZone } from 'date-fns-timezone'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function info(...args: any[]): void {
  console.info(
    formatToTimeZone(new Date(), 'YYYY-MM-DD HH:mm:ss', { timeZone: 'Asia/Seoul' }),
    ...args
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function warn(...args: any[]): void {
  console.warn(
    formatToTimeZone(new Date(), 'YYYY-MM-DD HH:mm:ss', { timeZone: 'Asia/Seoul' }),
    ...args
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function error(...args: any[]): void {
  console.error(
    formatToTimeZone(new Date(), 'YYYY-MM-DD HH:mm:ss', { timeZone: 'Asia/Seoul' }),
    ...args
  )
}
