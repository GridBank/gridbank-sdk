# Python SDK Installation

Get the GridBank Python SDK installed and ready to use in just a few minutes.

## Requirements

- **Python:** 3.8 or later
- **pip:** Python package manager (included with Python)

## Quick Install

Install the SDK from PyPI with a single command:

```bash
pip install gridbank-api
```

## Verify Installation

Confirm the SDK is installed correctly:

```bash
python -c "from gridbank_api import GridbankClient; print('✓ gridbank-api installed')"
```

## Using with Virtual Environment (Recommended)

Keep your project dependencies isolated with a virtual environment:

```bash
# Create a new virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install gridbank-api
pip install gridbank-api
```

## Alternative Installation Methods

**Poetry:**
```bash
poetry add gridbank-api
```

**Conda:**
```bash
conda install -c conda-forge gridbank-api
```

## Development Installation

To contribute or modify the SDK, clone and install in development mode:

```bash
git clone https://github.com/gridbank/gridbank-api-python.git
cd gridbank-api-python
pip install -e ".[dev]"
```

## Troubleshooting

**ModuleNotFoundError:** Make sure you're using the same Python environment where you installed `gridbank-api`. Activate your virtual environment if using one.

**Permission denied:** Try using `pip install --user gridbank-api` or use a virtual environment.

## Next Steps

- [Client Setup](client.md) — Initialize your first client
- [Method Reference](methods.md) — Explore available methods
- [Code Examples](examples.md) — Learn by example
- [Error Handling](../api-reference.md#error-codes) — Handle errors gracefully
