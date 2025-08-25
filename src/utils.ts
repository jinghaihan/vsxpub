/* eslint-disable no-console */
import type { MaybePromise, PublishOptions } from './types'
import c from 'ansis'
import Spinner from 'yocto-spinner'

export async function executeWithFeedback(options: {
  config: PublishOptions
  message: string
  successMessage: string
  errorMessage: string
  fn: () => MaybePromise<void>
  dryFn?: () => MaybePromise<void>
}): Promise<boolean> {
  let result = false
  const spinner = Spinner({ text: c.blue(options.message) }).start()

  const maxRetries = options.config.retry ?? 3
  const retryDelay = options.config.retryDelay ?? 1000
  let currentAttempt = 0

  while (currentAttempt <= maxRetries) {
    try {
      if (currentAttempt > 0) {
        console.log(c.yellow(`${options.message} (retry ${currentAttempt} of ${maxRetries})`))
      }

      if (options.config.dry) {
        console.log()
        await options.dryFn?.()
      }
      else {
        await options.fn()
      }

      result = true
      spinner.success(c.green(options.successMessage))
      break
    }
    catch (error) {
      currentAttempt++
      console.error(c.red(error instanceof Error ? error.message : String(error)))

      if (currentAttempt <= maxRetries) {
        console.log(c.yellow(`Retrying in ${retryDelay}ms...`))
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
      else {
        spinner.error(c.red(options.errorMessage))
        if (maxRetries > 0) {
          console.error(c.red(`Failed after ${maxRetries + 1} attempts`))
        }
        result = false
      }
    }
  }

  console.log()
  return result
}
