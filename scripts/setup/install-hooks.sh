#!/bin/sh
# POSIX sh has no portable pipefail; this script uses no pipelines.
set -eu

main() {
  cd "$(dirname "$0")/../.."
  if is_ci; then return; fi
  hooks_path=$(git config --get core.hooksPath || :)
  if [ -n "$hooks_path" ]; then
    echo 'Skipping hooks: core.hooksPath is already configured.'
    return
  fi
  install_hook
}

is_ci() {
  case "${CI:-}" in
  true | 1) return 0 ;;
  *) return 1 ;;
  esac
}

install_hook() {
  hooks_dir=$(git rev-parse --git-path hooks)
  mkdir -p "$hooks_dir"
  hook="$hooks_dir/pre-commit"
  if hook_exists; then
    echo 'Skipping existing pre-commit hook.'
    return
  fi
  write_hook
  echo 'Installed pre-commit hook.'
}

hook_exists() {
  [ -e "$hook" ] || [ -L "$hook" ]
}

write_hook() {
  hook_tmp_dir=$(mktemp -d "$hooks_dir/.pre-commit.XXXXXX")
  trap 'rm -rf "$hook_tmp_dir"' 0
  trap 'exit 1' HUP INT TERM
  cat >"$hook_tmp_dir/pre-commit" <<'HOOK'
#!/bin/sh
# koa-static-managed-hook
set -eu
npm run validate
HOOK
  chmod +x "$hook_tmp_dir/pre-commit"
  ln "$hook_tmp_dir/pre-commit" "$hooks_dir/"
}

main
