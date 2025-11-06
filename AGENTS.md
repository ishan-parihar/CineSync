# AGENT CODING GUIDELINES

## Build/Lint/Test Commands
```bash
# Setup (use venv: source venv/bin/activate)
pip install -e ".[dev]"

# Linting
flake8
black --check
isort --check-only
mypy lipsync_automation/

# Formatting
black
isort

# Testing - Single test: pytest tests/test_file.py::TestClass::test_method -v
pytest tests/ -v
pytest tests/test_shot_purpose.py::test_high_arousal_selects_reaction -v

# Pre-commit
pre-commit run --all-files

# Frontend
cd web-ui/frontend && npm run dev && npm run build && npm run lint
```

## Code Style Guidelines
- Line length: 88 chars (Black standard)
- Imports: isort with Black profile (stdlib/third-party/local groups)
- Types: Use typing hints, mypy strict mode (except lipsync_automation.*)
- Naming: snake_case for functions/variables, PascalCase for classes
- Error handling: Use structured logging, return False/None on failure
- Logging: Module-specific loggers (`logging.getLogger('lip_sync.module')`)
- Docstrings: Triple quotes, brief description
- Structure: Follow lipsync_automation/ package organization
- Frontend: TypeScript strict mode, Tailwind CSS, React hooks