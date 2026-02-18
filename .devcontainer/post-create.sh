#!/usr/bin/env bash
set -euo pipefail

if [ -s "/usr/local/share/nvm/nvm.sh" ]; then
    # Ensure npm uses the Node version installed by the Node feature via nvm.
    . "/usr/local/share/nvm/nvm.sh"
    nvm use 20 >/dev/null
fi

echo "Installing Codex CLI..."
npm install -g @openai/codex

echo "Installing frontend dependencies..."
pushd frontend >/dev/null
npm install
popd >/dev/null

echo "Restoring backend dependencies..."
dotnet restore backend/backend.sln

echo "Installing worker dependencies..."
pushd worker >/dev/null
if [ -d ".venv" ] && [ ! -x ".venv/bin/python" ]; then
    echo "Removing stale worker/.venv (missing interpreter)..."
    rm -rf ".venv"
fi
pipenv install
popd >/dev/null
