## Summary
- What changed and why.

## Scope
- Impacted modules: `backend` / `frontend` / `worker` / `infra`
- Environment or config changes (if any).

## Verification
- [ ] Backend tests: `dotnet test backend/backend.sln`
- [ ] Frontend build: `cd frontend && npm run build`
- [ ] Worker tests: `cd worker && pipenv run python -m unittest discover -s tests -t . -p 'test_*.py'`
- [ ] Other checks (describe).

## Notes
- Risks, follow-ups, or rollback considerations.

## UI Changes (if applicable)
- [ ] Screenshot/GIF attached (store references in `output/` when useful).
