import process from 'node:process'

export async function readTokenFromGitHubCli() {
  try {
    return await execCommand('gh', ['auth', 'token'])
  }
  catch {
    return ''
  }
}

export async function getGitHubRepo(baseUrl: string) {
  const url = await execCommand('git', ['config', '--get', 'remote.origin.url'])
  const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`${escapedBaseUrl}[\/:]([\\w\\d._-]+?)\\/([\\w\\d._-]+?)(\\.git)?$`, 'i')
  const match = regex.exec(url)
  if (!match)
    throw new Error(`Can not parse GitHub repo from url ${url}`)
  return `${match[1]}/${match[2]}`
}

export async function getGitTag() {
  const ref = process.env.GITHUB_REF
  if (ref?.startsWith('refs/tags/'))
    return ref.replace('refs/tags/', '')

  return await execCommand('git', ['tag', '--points-at', 'HEAD'])
}

export async function getVersionByGitTag() {
  const tag = await getGitTag()
  return tag.startsWith('v') ? tag.slice(1) : tag
}

async function execCommand(cmd: string, args: string[]) {
  const { execa } = await import('execa')
  const res = await execa(cmd, args)
  return res.stdout.trim()
}
