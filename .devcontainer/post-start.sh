#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
    echo "docker is not available in this container yet; skipping docker compose startup."
    exit 0
fi

if ! docker info >/dev/null 2>&1; then
    echo "docker daemon is not reachable; skipping docker compose startup."
    exit 0
fi

echo "Starting local support services with docker compose..."
docker compose up -d
