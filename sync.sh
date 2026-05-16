#!/usr/bin/env bash
# 双端同步：有落后就拉，有领先就推，脏工作区或分叉则报错
set -euo pipefail
cd "$(dirname "$0")"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "✗ 有未提交改动，请先 commit 或 stash："
  git status --short
  exit 1
fi

git fetch origin main --quiet
ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)

if [[ "$ahead" == "0" && "$behind" == "0" ]]; then
  echo "✓ 已与 origin/main 同步"
elif [[ "$behind" -gt 0 && "$ahead" == "0" ]]; then
  echo "↓ 从 origin/main 拉取 $behind 个 commit..."
  git pull --ff-only origin main
elif [[ "$ahead" -gt 0 && "$behind" == "0" ]]; then
  echo "↑ 推送 $ahead 个 commit 到 origin/main..."
  git push origin HEAD:main
else
  echo "✗ 已分叉：领先 $ahead / 落后 $behind，需手工 rebase"
  exit 1
fi
