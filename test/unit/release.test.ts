import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

type Registry = Record<string, string>
type Publications = { commands: string[][] }

const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
const publishBlock = workflow.split("          node <<'NODE'\n")[1]
const publishScript = publishBlock.split('          NODE')[0]
const commit = 'checked-commit'

/** Simulate npm registry responses and record publish commands without network access. */
function mockCommand(registry: Registry, publications: Publications) {
  /** Resolve git and npm requests from local fixtures. */
  function execFileSync(command: string, args: string[]) {
    if (command === 'git') return commit
    if (args[0] === 'publish') {
      const commands = [...publications.commands, args]
      publications.commands = commands
      return ''
    }
    const value = registry[`${args[1]}|${args[2]}`]
    if (value !== undefined) {
      const output = JSON.stringify(value)
      return output
    }
    const error = { code: 'E404' }
    const stdout = JSON.stringify({ error })
    throw Object.assign(new Error('Not found'), { stdout })
  }
  return execFileSync
}

/** Execute the workflow's publish script against a mock registry and validated commit. */
function runPublish(version: string, registry: Registry = {}, expected = commit) {
  const commands: string[][] = []
  const publications = { commands }
  const execFileSync = mockCommand(registry, publications)
  const childProcess = { execFileSync }
  const metadata = { name: 'koa-static', version }
  /** Supply only the package metadata and mocked child-process module. */
  const require = (name: string) => {
    if (name === './package.json') return metadata
    assert.equal(name, 'node:child_process')
    return childProcess
  }
  const env = { EXPECTED_COMMIT: expected, GITHUB_SHA: 'dispatch-commit' }
  const write = (message: string) => message.length
  const stdout = { write }
  const process = { env, stdout }
  const context = { require, process }
  runInNewContext(publishScript, context)
  const { commands: published } = publications
  return published
}

/** Assert that the workflow publishes once using the expected distribution tag. */
function assertPublished(version: string, tag: string, registry: Registry = {}) {
  const publications = runPublish(version, registry)
  const normalized = publications.map((args) => Array.from(args))
  assert.deepEqual(normalized, [['publish', '--ignore-scripts', '--tag', tag]])
}

describe('release publication', () => {
  it('publishes a validated tag when manual dispatch uses another commit', () => {
    assertPublished('6.0.0', 'latest')
  })

  it('rejects a checkout different from the validated commit', () => {
    assert.throws(() => runPublish('6.0.0', {}, 'other-commit'), /validated commit/)
  })

  it('skips a version already published from this commit', () => {
    const registry = { 'koa-static@6.0.0|gitHead': commit }
    assert.deepEqual(runPublish('6.0.0', registry), [])
  })

  it('rejects an existing version from another commit', () => {
    const registry = { 'koa-static@6.0.0|gitHead': 'other-commit' }
    assert.throws(() => runPublish('6.0.0', registry), /different or unknown commit/)
  })

  it('rejects an existing version with no recorded commit', () => {
    const registry = { 'koa-static@6.0.0|gitHead': '' }
    assert.throws(() => runPublish('6.0.0', registry), /different or unknown commit/)
  })
})

describe('stable release tags', () => {
  it('publishes the newest backport under its major tag', () => {
    const registry = { 'koa-static@>6.0.0|version': '7.0.0' }
    assertPublished('6.0.0', 'v6-latest', registry)
  })

  it('rejects an older stable release when its major tag is missing', () => {
    const registry = {
      'koa-static@>6.0.0|version': '7.0.0',
      'koa-static@>6.0.0 6|version': '6.1.0'
    }
    assert.throws(() => runPublish('6.0.0', registry), /older than a published stable/)
  })

  it('rejects moving an existing major tag backward', () => {
    const registry = {
      'koa-static@>6.0.0|version': '7.0.0',
      'koa-static|dist-tags.v6-latest': '6.1.0',
      'koa-static@6.1.0 >6.0.0|version': '6.1.0'
    }
    assert.throws(() => runPublish('6.0.0', registry), /move v6-latest backward/)
  })
})

describe('prerelease tags', () => {
  it('rejects moving next to an older prerelease', () => {
    const registry = {
      'koa-static|dist-tags.next': '6.0.0-beta.2',
      'koa-static@6.0.0-beta.2 >6.0.0-beta.1|version': '6.0.0-beta.2'
    }
    assert.throws(() => runPublish('6.0.0-beta.1', registry), /move next backward/)
  })

  it('allows next to advance to a newer prerelease', () => {
    const registry = { 'koa-static|dist-tags.next': '6.0.0-beta.1' }
    assertPublished('6.0.0-beta.2', 'next', registry)
  })

  it('publishes the first prerelease under next', () => {
    assertPublished('6.0.0-beta.1', 'next')
  })
})
