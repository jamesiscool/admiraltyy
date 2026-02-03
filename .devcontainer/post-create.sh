#!/bin/bash
set -euo pipefail

git config --global user.name "James Leslie"
git config --global user.email "james@jamesleslie.com"
git config --global push.autoSetupRemote true
git config --global --add safe.directory /workspace

sudo chown -R node:node /workspace


# Install nzbget v25+ from community fork (apt only has ancient 21.0)
NZBGET_VERSION="25.4"
ARCH=$(dpkg --print-architecture)
NZBGET_DEB="nzbget-${NZBGET_VERSION}-${ARCH}.deb"
curl -fsSL "https://github.com/nzbgetcom/nzbget/releases/download/v${NZBGET_VERSION}/${NZBGET_DEB}" -o "/tmp/${NZBGET_DEB}"
sudo dpkg -i "/tmp/${NZBGET_DEB}" || sudo apt-get install -f -y
rm "/tmp/${NZBGET_DEB}"

bun install
bun add -g @antfu/ni agent-browser
chmod +x /home/node/.bun/install/global/node_modules/agent-browser/bin/agent-browser-linux-arm64
echo 'export PATH="/home/node/.bun/bin:$PATH"' >> /home/node/.zshrc
echo 'alias claude="claude --dangerously-skip-permissions"' >> /home/node/.zshrc
echo 'alias cc="claude --dangerously-skip-permissions"' >> /home/node/.zshrc
echo 'alias nd="bun run dev"' >> /home/node/.zshrc

