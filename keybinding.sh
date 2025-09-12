#!/usr/bin/env bash
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  KEYBIND_FILE="$HOME/.config/Code/User/keybindings.json"
elif [[ "$OSTYPE" == "darwin"* ]]; then
  KEYBIND_FILE="$HOME/Library/Application Support/Code/User/keybindings.json"
elif [[ "$OS" == "Windows_NT" ]]; then
  KEYBIND_FILE="$APPDATA/Code/User/keybindings.json"
else
  echo "Unsupported OS"
  exit 1
fi

mkdir -p "$(dirname "$KEYBIND_FILE")"
KEYBIND_ENTRY='  {
    "key": "ctrl+shift+r",
    "command": "workbench.action.tasks.runTask",
    "args": "Run All",
    "when": "workspaceFolderCount > 0"
  }'
if [ ! -f "$KEYBIND_FILE" ]; then
  echo "[$KEYBIND_ENTRY]" > "$KEYBIND_FILE"
  echo "Created new keybindings.json with Run All shortcut ✅"
  exit 0
fi
if grep -q '"Run All"' "$KEYBIND_FILE"; then
  echo "Keybinding for Run All already exists ✅"
  exit 0
fi
sed -i.bak '$d' "$KEYBIND_FILE"
echo "," >> "$KEYBIND_FILE"
echo "$KEYBIND_ENTRY" >> "$KEYBIND_FILE"
echo "]" >> "$KEYBIND_FILE"

echo "Added Run All shortcut (Ctrl+Shift+R) ✅"
