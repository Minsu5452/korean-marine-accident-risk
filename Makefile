.PHONY: test lint typecheck clean-report

test:
	uv run pytest
lint:
	uv run ruff check .
typecheck:
	uv run mypy
clean-report:
	uv run python scripts/clean_accidents.py
