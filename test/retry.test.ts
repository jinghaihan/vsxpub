import type { Options } from '../src/types'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PUBLISH_OPTIONS } from '../src/constants'
import { runWithRetry } from '../src/utils'

const cliOptions: Options = {
  ...DEFAULT_PUBLISH_OPTIONS,
  cwd: '/test',
  dry: false,
  repo: 'test/repo',
  tag: 'v1.0.0',
  name: 'test-extension',
  version: '1.0.0',
  dependencies: true,
  githubToken: 'token',
  vscePat: 'vsce-pat',
  ovsxPat: 'ovsx-pat',
}

describe('runWithRetry', () => {
  it('should execute function successfully', async () => {
    const mockFn = vi.fn().mockResolvedValue(undefined)

    const result = await runWithRetry({
      config: cliOptions,
      message: 'Testing...',
      successMessage: 'Success!',
      errorMessage: 'Failed!',
      fn: mockFn,
    })

    expect(result).toBe(true)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should execute dryFn when in dry mode', async () => {
    const mockFn = vi.fn()
    const mockDryFn = vi.fn().mockResolvedValue(undefined)

    const result = await runWithRetry({
      config: { ...cliOptions, dry: true },
      message: 'Testing...',
      successMessage: 'Dry Run Success!',
      errorMessage: 'Dry Run Failed!',
      fn: mockFn,
      dryFn: mockDryFn,
    })

    expect(result).toBe(true)
    expect(mockFn).not.toHaveBeenCalled()
    expect(mockDryFn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce(undefined)

    const result = await runWithRetry({
      config: { ...cliOptions, retry: 2, retryDelay: 10 },
      message: 'Testing...',
      successMessage: 'Success!',
      errorMessage: 'Failed!',
      fn: mockFn,
    })

    expect(result).toBe(true)
    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should fail after exhausting retries', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockRejectedValueOnce(new Error('Third failure'))

    const result = await runWithRetry({
      config: { ...cliOptions, retry: 2, retryDelay: 10 },
      message: 'Testing...',
      successMessage: 'Success!',
      errorMessage: 'Failed!',
      fn: mockFn,
    })

    expect(result).toBe(false)
    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should not retry when retryCount is not provided', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Error'))

    const result = await runWithRetry({
      config: { ...cliOptions, retry: 0 },
      message: 'Testing...',
      successMessage: 'Success!',
      errorMessage: 'Failed!',
      fn: mockFn,
    })

    expect(result).toBe(false)
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
