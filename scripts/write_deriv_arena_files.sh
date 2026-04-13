#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-/tmp/deriv-arena}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Target directory not found: $TARGET_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR/public/js" "$TARGET_DIR/public/css" "$TARGET_DIR/src/agents"

cp "$ROOT_DIR/public/index.html" "$TARGET_DIR/public/index.html"
cp "$ROOT_DIR/public/app.js" "$TARGET_DIR/public/js/app.js"
cp "$ROOT_DIR/public/styles.css" "$TARGET_DIR/public/css/style.css"
cp "$ROOT_DIR/src/server.js" "$TARGET_DIR/src/server.js"
cp "$ROOT_DIR/src/agents/"*.js "$TARGET_DIR/src/agents/"

echo "Deriv Arena files written from $ROOT_DIR to $TARGET_DIR"
