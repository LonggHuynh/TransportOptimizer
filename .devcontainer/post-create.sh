#!/usr/bin/env bash
set -euo pipefail

if [ -s "/usr/local/share/nvm/nvm.sh" ]; then
    # Ensure npm uses the Node version installed by the Node feature via nvm.
    . "/usr/local/share/nvm/nvm.sh"
    nvm use 20 >/dev/null
fi

echo "Installing frontend dependencies..."
pushd frontend >/dev/null
npm install
popd >/dev/null

echo "Restoring backend dependencies..."
dotnet restore backend/backend.sln

echo "Installing worker dependencies..."
pushd worker >/dev/null
if ! command -v pipenv >/dev/null 2>&1; then
    echo "pipenv was not found in PATH. Ensure the Python feature installed it."
    exit 1
fi
pipenv install
popd >/dev/null
