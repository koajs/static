import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
const releaseBlock = workflow.split('      - name: Create release\n')[1]
const releaseScript = releaseBlock.split('        run: |\n')[1]
const mockGh = String.raw`#!/bin/sh
case "$1 $2" in
  api\ *) printf '%s\n' "$MOCK_TAG_COMMIT" ;;
  "release view")
    if [ "$MOCK_DRAFT" = "missing" ]; then exit 1; fi
    printf '%s\n' "$MOCK_DRAFT"
    ;;
  "release create") printf '%s\n' "$*" > "$MOCK_CREATED" ;;
  *) exit 2 ;;
esac
`

/** Create an isolated mock GitHub CLI inside the repository's ignored tmp directory. */
function createFixture() {
  mkdirSync('tmp', { recursive: true })
  const directory = mkdtempSync(path.resolve('tmp/release-tests-'))
  const executable = path.join(directory, 'gh')
  writeFileSync(executable, mockGh, { mode: 0o755 })
  return directory
}

/** Configure the mock tag, draft state, and command path for a release test. */
function releaseEnvironment(directory: string, tagCommit: string, draft: string) {
  const PATH = `${directory}:${process.env.PATH}`
  const MOCK_CREATED = path.join(directory, 'created')
  const env = {
    ...process.env,
    PATH,
    MOCK_CREATED,
    MOCK_TAG_COMMIT: tagCommit,
    MOCK_DRAFT: draft,
    TAG: 'v6.0.0',
    EXPECTED_COMMIT: 'checked-commit',
    GH_REPO: 'koajs/static'
  }
  return env
}

/** Run the release step with a mock GitHub CLI and remove its temporary fixtures. */
function runRelease(tagCommit: string, draft = 'missing') {
  const directory = createFixture()
  const env = releaseEnvironment(directory, tagCommit, draft)
  try {
    const args = ['-eo', 'pipefail', '-c', releaseScript]
    const output = execFileSync('/bin/bash', args, { env, encoding: 'utf8' })
    const created = existsSync(env.MOCK_CREATED)
    const result = { output, created }
    return result
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('GitHub release creation', () => {
  it('rejects a tag that moved after validation', () => {
    assert.throws(() => runRelease('moved-commit'), /moved from validated commit/)
  })

  it('rejects an existing draft instead of reporting success', () => {
    assert.throws(() => runRelease('checked-commit', 'true'), /is a draft/)
  })

  it('skips an existing published release', () => {
    const result = runRelease('checked-commit', 'false')
    assert.equal(result.created, false)
    assert.match(result.output, /already exists/)
  })

  it('creates a release when the validated tag has no existing release', () => {
    const result = runRelease('checked-commit')
    assert.equal(result.created, true)
  })
})
