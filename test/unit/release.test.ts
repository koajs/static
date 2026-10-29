import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

interface Registry {
  versions?: string[]
  integrity?: string
  error?: boolean
  malformed?: boolean
}

const tarball = 'tmp/artifacts/koa-static-6.0.0.tgz'
const bytes = Buffer.from('tested release artifact')
const digest = createHash('sha512').update(bytes).digest('base64')
const integrity = `sha512-${digest}`
const unsupportedPlatform = process.platform === 'win32'
const suiteOptions = { skip: unsupportedPlatform }
const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
const step = workflow.split('      - name: Publish checked package\n')[1]
assert.ok(step, 'release workflow must have a publish step')
const command = step.replace(/^        run: \|?\s*/, '').replace(/^          /gm, '')
const npmStub = `#!${process.execPath}
const assert = require('node:assert/strict')
const fs = require('node:fs')
const registry = JSON.parse(fs.readFileSync('registry.json', 'utf8'))
const args = process.argv.slice(2)
if (args[0] === 'publish') {
  assert.deepEqual(args, ['publish', '${tarball}', '--ignore-scripts'])
  fs.writeFileSync('published', 'attempted')
  if (registry.versions?.includes('6.0.0')) process.exit(1)
} else {
  if (registry.error) process.exit(1)
  if (registry.malformed) { process.stdout.write('not json'); process.exit(0) }
  const versionsQuery = ['view', 'koa-static', 'versions', '--json']
  const integrityQuery = ['view', 'koa-static@6.0.0', 'dist.integrity', '--json']
  const versions = JSON.stringify(args) === JSON.stringify(versionsQuery)
  if (!versions) assert.deepEqual(args, integrityQuery)
  const response = versions ? registry.versions : registry.integrity
  process.stdout.write(JSON.stringify(response) ?? '')
}
`

describe('release version ordering', suiteOptions, function () {
  it('publishes the checked tarball when no newer stable version exists', function () {
    const versions = ['5.99.99', '7.0.0-beta.1']
    const result = release({ versions })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.published, true)
  })

  const newerVersions = ['6.0.1', '6.1.0', '7.0.0', '10.0.0', '6.0.1+build']
  newerVersions.forEach((version) => {
    it(`rejects an unpublished 6.0.0 when ${version} is published`, function () {
      const versions = ['5.0.0', version]
      const result = release({ versions })
      assert.notEqual(result.status, 0)
      assert.equal(result.published, false)
      assert.match(result.stderr, /newer stable version/)
    })
  })
})

describe('release reruns', suiteOptions, function () {
  it('skips a matching published tarball even after a newer release', function () {
    const versions = ['5.0.0', '6.0.0', '7.0.0']
    const result = release({ versions, integrity })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.published, false)
    assert.match(result.stdout, /already published/)
  })

  it('rejects a different tarball published under the same version', function () {
    const versions = ['6.0.0']
    const result = release({ versions, integrity: 'sha512-different' })
    assert.notEqual(result.status, 0)
    assert.equal(result.published, false)
    assert.match(result.stderr, /integrity/)
  })

  it('rejects a published version without integrity metadata', function () {
    const versions = ['6.0.0']
    const result = release({ versions })
    assert.notEqual(result.status, 0)
    assert.equal(result.published, false)
  })
})

describe('release registry failures', suiteOptions, function () {
  it('does not publish after a registry lookup fails', function () {
    const result = release({ error: true })
    assert.notEqual(result.status, 0)
    assert.equal(result.published, false)
  })

  it('does not publish when registry metadata is malformed', function () {
    const result = release({ malformed: true })
    assert.notEqual(result.status, 0)
    assert.equal(result.published, false)
  })
})

function release(registry: Registry) {
  mkdirSync('tmp', { recursive: true })
  const directory = mkdtempSync(path.resolve('tmp/release-test-'))
  try {
    prepare(directory, registry)
    const searchPath = `${directory}/bin:${process.env.PATH}`
    const env = { ...process.env, PATH: searchPath }
    const options = { cwd: directory, env, encoding: 'utf8' } as const
    const args = ['-e', '-o', 'pipefail', '-c', command]
    const { status, stdout, stderr, error } = spawnSync('/bin/bash', args, options)
    assert.ifError(error)
    const published = existsSync(path.join(directory, 'published'))
    const output = { status, stdout, stderr, published }
    return output
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

function prepare(directory: string, registry: Registry) {
  const artifacts = path.join(directory, 'tmp/artifacts')
  const bin = path.join(directory, 'bin')
  const manifest = { name: 'koa-static', version: '6.0.0' }
  mkdirSync(artifacts, { recursive: true })
  mkdirSync(bin)
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify(manifest))
  writeFileSync(path.join(directory, 'registry.json'), JSON.stringify(registry))
  writeFileSync(path.join(directory, tarball), bytes)
  writeFileSync(path.join(bin, 'npm'), npmStub, { mode: 0o755 })
}
