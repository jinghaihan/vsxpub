import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { join } from 'pathe'

export async function getPackageName(cwd: string = process.cwd()): Promise<string> {
  const { name } = await readPackageJSON(cwd)
  return name || ''
}

export async function getPackageVersion(cwd: string = process.cwd()): Promise<string> {
  const { version } = await readPackageJSON(cwd)
  return version || ''
}

export async function readPackageJSON(cwd: string = process.cwd()) {
  const path = join(cwd, 'package.json')
  if (!existsSync(path))
    return {}

  const content = await readFile(path, 'utf-8')
  return JSON.parse(content)
}
