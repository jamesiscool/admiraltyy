#!/bin/bash
set -euo pipefail

git config --global user.name "James Leslie"
git config --global user.email "james@jamesleslie.com"
git config --global push.autoSetupRemote true


sudo chown -R node:node /workspace

bun install
bun add -g @antfu/ni agent-browser
chmod +x /home/node/.bun/install/global/node_modules/agent-browser/bin/agent-browser-linux-arm64
echo 'export PATH="/home/node/.bun/bin:$PATH"' >> /home/node/.zshrc
echo 'alias claude="claude --dangerously-skip-permissions"' >> /home/node/.zshrc
echo 'alias cc="claude --dangerously-skip-permissions"' >> /home/node/.zshrc
echo 'alias nd="bun run dev"' >> /home/node/.zshrc

