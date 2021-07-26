import 'koa-body'
import * as Koa from 'koa'
import { KoaController, Controller, Get } from 'koa-joi-controllers'
import { success } from 'lib/response'

@Controller('/statistic')
export default class StatisticController extends KoaController {
  @Get('/')
  async getStatistic(ctx: Koa.Context): Promise<void> {
    success(ctx, 'ok')
  }
}
