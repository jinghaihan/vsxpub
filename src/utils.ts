/* eslint-disable no-console */
import type { MaybePromise, Options } from './types'
import c from 'ansis'
import pRetry from 'p-retry'
import Spinner from 'yocto-spinner'

export async function runWithRetry(options: {
  config: Options
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

  await pRetry(
    async () => {
      try {
        if (currentAttempt > 0)
          console.log(c.yellow(`${options.message} (retry ${currentAttempt} of ${maxRetries})`))

        if (options.config.dry) {
          console.log()
          await options.dryFn?.()
        }
        else {
          await options.fn()
        }

        result = true
        spinner.success(c.green(options.successMessage))
      }
      catch (error) {
        currentAttempt++
        console.error(c.red(error instanceof Error ? error.message : String(error)))

        if (currentAttempt <= maxRetries) {
          console.log(c.yellow(`Retrying in ${retryDelay}ms...`))
          throw error
        }
        else {
          spinner.error(c.red(options.errorMessage))
          if (maxRetries > 0)
            console.error(c.red(`Failed after ${maxRetries + 1} attempts`))
          result = false
        }
      }
    },
    {
      retries: maxRetries,
      minTimeout: retryDelay,
      maxTimeout: retryDelay * 2,
    },
  )

  console.log()
  return result
}
