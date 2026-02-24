#!/bin/bash
# Build the custom sandbox image for advisors
# Run from the repo root: ./scripts/build-sandbox-advisor.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Building openclaw-sandbox-advisor image..."
docker build \
  -f "$REPO_ROOT/openclaw/Dockerfile.sandbox-advisor" \
  -t openclaw-sandbox-advisor:latest \
  "$REPO_ROOT"

echo "Done. Image: openclaw-sandbox-advisor:latest"
