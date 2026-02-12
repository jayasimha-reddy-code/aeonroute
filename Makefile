.PHONY: help install install-dev test lint format clean docker-build docker-run tensorboard

help:
	@echo "EV Routing Project - Development Commands"
	@echo "==========================================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install          - Install project dependencies"
	@echo "  make install-dev      - Install dev dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make test             - Run pytest suite"
	@echo "  make test-fast        - Run tests without slow markers"
	@echo "  make coverage         - Generate coverage report"
	@echo "  make lint             - Run linting checks"
	@echo "  make format           - Format code with black & isort"
	@echo "  make typecheck        - Run mypy type checking"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build     - Build Docker image"
	@echo "  make docker-test      - Run tests in Docker"
	@echo "  make docker-train     - Run training in Docker"
	@echo "  make tensorboard      - Start TensorBoard server"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean            - Remove generated files"
	@echo "  make clean-all        - Remove all build artifacts"

install:
	pip install --upgrade pip
	pip install -r requirements.txt

install-dev:
	pip install --upgrade pip
	pip install -r requirements-dev.txt
	pre-commit install

test:
	pytest src -v --tb=short

test-fast:
	pytest src -v -m "not slow"

coverage:
	pytest src --cov=src --cov-report=html --cov-report=term-missing
	@echo "Coverage report: htmlcov/index.html"

lint:
	flake8 src --count --select=E9,F63,F7,F82 --show-source
	flake8 src --count --exit-zero --max-complexity=10

format:
	black src tests
	isort src tests

typecheck:
	mypy src --ignore-missing-imports

docker-build:
	docker build -f docker/Dockerfile -t ev-routing:latest .

docker-test:
	docker run --rm ev-routing:latest python -m pytest src -v

docker-train:
	docker-compose -f docker-compose.yml up training

tensorboard:
	tensorboard --logdir=results --host=0.0.0.0 --port=6006

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .coverage htmlcov .mypy_cache
	rm -rf src/*.egg-info dist build

clean-all: clean
	rm -rf .venv venv env
	rm -rf models/*/
	rm -rf results/*/
