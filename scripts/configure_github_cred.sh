#!/usr/bin/env bash
set -euo pipefail

USERNAME="${1:-}"
REPO_URL="${2:-https://github.com/vancore876/deriv-server-bot.git}"
TOKEN="${3:-${GITHUB_TOKEN:-}}"

if [[ -z "$USERNAME" ]]; then
  echo "Usage: $0 <github-username> [repo-url] [token|use GITHUB_TOKEN env]" >&2
  exit 1
fi

if [[ -z "$TOKEN" ]]; then
  echo "Missing token. Provide as arg3 or set GITHUB_TOKEN." >&2
  exit 1
fi

# local repo identity
git config user.name "$USERNAME"
git config user.email "${USERNAME}@users.noreply.github.com"

# configure remote with https
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

# store credentials for non-interactive pushes
GIT_CRED_FILE="$HOME/.git-credentials"
printf 'https://%s:%s@github.com\n' "$USERNAME" "$TOKEN" > "$GIT_CRED_FILE"
chmod 600 "$GIT_CRED_FILE"
git config --global credential.helper store

echo "GitHub credentials configured for $USERNAME and origin set to $REPO_URL"
echo "You can now run: git push -u origin work"
