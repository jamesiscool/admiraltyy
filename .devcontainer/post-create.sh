#!/bin/bash
set -e

bun install
bun add -g @antfu/ni agent-browser
chmod +x /home/node/.bun/install/global/node_modules/agent-browser/bin/agent-browser-linux-arm64 2>/dev/null || true
echo 'export PATH="/home/node/.bun/bin:$PATH"' >> /home/node/.zshrc
echo 'alias claude="claude --dangerously-skip-permissions"' >> /home/node/.zshrc
echo 'alias cc="claude --dangerously-skip-permissions"' >> /home/node/.zshrc
echo 'source ~/.config/zsh/aliases.zsh' >> /home/node/.zshrc
sudo chown -R node /workspace
