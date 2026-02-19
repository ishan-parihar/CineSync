# AGENT CODING GUIDELINES

## Project Structure & Environment
- Backend: Work in root directory, use venv (`source venv/bin/activate`)
- Frontend: Work in `frontend/` directory
- Python package: `lipsync_automation/`
- Log pattern: `logging.getLogger('lip_sync.module_name')`

## Backend Commands
```bash
# Setup
pip install -e ".[dev]"

# Linting
flake8
black --check
isort --check-only
mypy lipsync_automation/

# Formatting
black
isort

# Testing (uses pytest.ini markers: unit, integration, slow, api, frontend, network)
pytest tests/ -v
pytest tests/test_shot_purpose.py::test_high_arousal_selects_reaction -v

# Pre-commit
pre-commit run --all-files
```

## Frontend Commands (in frontend/ directory)
```bash
# Development
npm run dev
npm run build

# Testing
npm test          # Jest unit tests
npm run test:e2e  # Cypress
npm run test:e2e:playwright  # Playwright
npm run test:a11y # Accessibility tests
npm run test:perf # Lighthouse CI
npm run lint      # ESLint
```

## Code Standards
- Python: 88 char lines, snake_case functions, PascalCase classes, typing hints
- TypeScript: Next.js 16, React 19, Tailwind CSS, React hooks
- Error handling: Structured logging, return False/None on failure
- Imports: isort Black profile (stdlib/third-party/local groups)
- Docstrings: Triple quotes, brief description