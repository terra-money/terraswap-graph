export class ParamsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParamsError'
    this.message = message
  }
}
