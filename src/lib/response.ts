import { Context } from 'koa'
import { HttpStatusCodes, ErrorTypes } from 'lib/error'

export function success(ctx: Context, body?: unknown): void {
  ctx.status = 200

  ctx.body = !body ? JSON.stringify(body) : body
}

export function error(ctx: Context, type: string, code?: number, message?: string): void {
  ctx.status = HttpStatusCodes[type as ErrorTypes] || 500

  ctx.body = {
    type,
    code,
    message,
  }
}
