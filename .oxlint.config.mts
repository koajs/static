import { defineConfig } from 'oxlint'
import legibility from 'oxlint-plugin-legibility'

const presets = [legibility.configs.agentStrict]
const ignorePatterns = ['dist/**', 'artifacts/**', '.compat/**']
const config = defineConfig({ extends: presets, ignorePatterns })

export default config
