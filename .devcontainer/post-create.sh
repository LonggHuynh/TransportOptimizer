#!/usr/bin/env bash
set -euo pipefail

echo "Installing frontend dependencies..."
pushd frontend >/dev/null
npm install
popd >/dev/null

echo "Restoring backend dependencies..."
dotnet restore backend/backend.sln

echo "Installing worker dependencies..."
pushd worker >/dev/null
python -m pip install --upgrade pip pipenv
pipenv install
popd >/dev/null
