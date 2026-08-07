#!/usr/bin/env bash
# 將本儲存庫的技能以符號連結安裝到 Claude Code、Codex 或 OpenCode。
#
#   ./scripts/install.sh --codex --opencode
#   ./scripts/install.sh novel-characters --codex
#   ./scripts/install.sh --uninstall --codex --opencode
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$REPO/skills"

targets=()
wanted=()
uninstall=0

for arg in "$@"; do
  case "$arg" in
    --claude)     targets+=("$HOME/.claude/skills") ;;
    --codex)      targets+=("$HOME/.codex/skills") ;;
    --opencode)   targets+=("$HOME/.config/opencode/skills") ;;
    --uninstall)  uninstall=1 ;;
    -h|--help)
      sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*)
      echo "未知選項：$arg" >&2
      exit 1
      ;;
    *) wanted+=("$arg") ;;
  esac
done

# 未指定目標時，只安裝到已存在的客戶端設定目錄。
if [ ${#targets[@]} -eq 0 ]; then
  [ -d "$HOME/.claude" ] && targets+=("$HOME/.claude/skills")
  [ -d "$HOME/.codex" ] && targets+=("$HOME/.codex/skills")
  [ -d "$HOME/.config/opencode" ] && targets+=("$HOME/.config/opencode/skills")
fi
if [ ${#targets[@]} -eq 0 ]; then
  echo "找不到支援的客戶端。請指定 --claude、--codex 或 --opencode。" >&2
  exit 1
fi

# 未指定技能時安裝全部技能。
if [ ${#wanted[@]} -eq 0 ]; then
  for dir in "$SKILLS_DIR"/*/; do
    [ -f "$dir/SKILL.md" ] && wanted+=("$(basename "$dir")")
  done
fi

for target in "${targets[@]}"; do
  mkdir -p "$target"
  for name in "${wanted[@]}"; do
    src="$SKILLS_DIR/$name"
    dst="$target/$name"

    if [ ! -f "$src/SKILL.md" ]; then
      echo "✗ $name 不是有效技能：缺少 SKILL.md" >&2
      exit 1
    fi

    if [ "$uninstall" -eq 1 ]; then
      if [ -L "$dst" ]; then
        rm "$dst"
        echo "− 已移除 $dst"
      elif [ -e "$dst" ]; then
        echo "! 保留 $dst：它不是本安裝器建立的符號連結" >&2
      fi
      continue
    fi

    if [ -e "$dst" ] && [ ! -L "$dst" ]; then
      echo "✗ 保留 $dst：既有項目不是符號連結" >&2
      exit 1
    fi

    ln -sfn "$src" "$dst"
    echo "✓ $dst → $src"
  done
done
