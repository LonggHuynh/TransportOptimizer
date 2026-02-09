# Repository Guidelines

## Project Structure & Module Organization
- `frontend/`: React + TypeScript (Vite). Main UI code is in `frontend/src/` with `components/`, `hooks/`, `pages/`, `models/`, and `styles/`.
- `backend/`: .NET 8 API. Core layers are `Controllers/`, `Services/`, `Externals/`, `Models/`, and `Configuration/` under `backend/api/`.
- `worker/`: Python Celery worker for route computation (`main.py`, `tasks.py`, `route_solver.py`).
- `infra/`: Terraform and Helm chart files for GCP/Kubernetes deployment.
- `output/`: UI/debug screenshots and generated artifacts; do not treat as source code.

## Build, Test, and Development Commands
- Frontend dev server: `cd frontend && npm install && npm run dev`
- Frontend production build: `cd frontend && npm run build`
- Backend run locally: `dotnet run --project backend/api/api.csproj`
- Backend build check: `dotnet build backend/backend.sln`
- Worker setup/run: `cd worker && pipenv install && pipenv run python main.py`
- Local Redis (for backend/worker integration): `docker compose up -d`

## Coding Style & Naming Conventions
- Use 4-space indentation across TypeScript, C#, and Python files.
- TypeScript: strict mode is enabled; prefer explicit types for shared models and store state.
- React: component files use `PascalCase` (for example, `RouteForm.tsx`); hooks use `useXxx` naming.
- C#: keep `PascalCase` for public members/types and `camelCase` for locals/parameters; keep nullable-safe patterns.
- Python: follow PEP 8 and `snake_case` for modules/functions.

## Testing Guidelines
- Backend test stack is NUnit (`NUnit`, `Moq`, `Microsoft.NET.Test.Sdk` are referenced).
- Add new backend tests under `backend/api/Tests/` with names like `RouteServiceTests.cs`.
- Run tests with `dotnet test backend/backend.sln`.
- Frontend currently has testing libraries installed but no standard test script; add tests with the feature and document the run command in the same PR.

## Commit & Pull Request Guidelines
- Use short, imperative commit subjects (examples in history: `Moved to celery.`, `Updated infra.`), optionally with `(#123)` suffix.
- For every completed request, create a commit with a clear message describing what was done.
- Keep commits focused by area (`frontend`, `backend`, `worker`, `infra`).
- PRs should include: purpose, impacted modules, environment/config changes, and verification steps.
- Include screenshots/GIFs for UI changes (store references in `output/` when useful).

## Security & Configuration Tips
- Never commit secrets. Use env vars/secrets for `Mapbox:AccessToken`, `GoogleMaps:ApiKey`, and Redis credentials.
- Prefer local `.env`/secret manager wiring over hardcoded tokens and keys.
