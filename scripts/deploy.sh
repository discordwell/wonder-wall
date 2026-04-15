#!/usr/bin/env bash
set -euo pipefail

# Deploy WonderWall PWA to OVH-2
# Usage: ./scripts/deploy.sh

echo "Building..."
npm run build

echo "Deploying to wonderwall.discordwell.com..."
rsync -az --delete \
  -e "ssh -p 41022 -i $HOME/.ssh/ovh2_vps" \
  packages/app/dist/ \
  ubuntu@15.204.59.61:/opt/wonderwall/site/

echo "Done → https://wonderwall.discordwell.com"
