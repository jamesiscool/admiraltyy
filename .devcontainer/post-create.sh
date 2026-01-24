#!/bin/bash
set -e

git config --global --add safe.directory /workspace
sudo chown -R node:node /workspace/node_modules
bun install
bun add -g @antfu/ni
echo 'export PATH="/home/node/.bun/bin:$PATH"' >> ~/.zshrc
echo 'source ~/.config/zsh/aliases.zsh' >> ~/.zshrc
