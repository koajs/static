#!/bin/sh
# POSIX sh has no portable pipefail; this script uses no pipelines.
set -eu

main() {
  cd "$(dirname "$0")/../.."
  npm ci --ignore-scripts
  npm run validate
  ./scripts/setup/install-hooks.sh
}

main
