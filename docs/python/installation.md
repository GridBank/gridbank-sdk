# Python SDK Installation

## Requirements

- Python 3.8 or later
- pip package manager

## Install from PyPI

```bash
pip install gridbank-api
```

## Verify Installation

```bash
python -c "from gridbank_api import GridbankClient; print('✓ gridbank-api installed')"
```

## Using with Virtual Environment (Recommended)

```bash
# Create a new virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install gridbank-api
pip install gridbank-api
```

## Using with Poetry

```bash
poetry add gridbank-api
```

## Using with Conda

```bash
conda install -c conda-forge gridbank-api
```

## Development Installation

To contribute to the SDK, clone the repository and install in development mode:

```bash
git clone https://github.com/gridbank/gridbank-api-python.git
cd gridbank-api-python
pip install -e ".[dev]"
```

## Next Step

Once installed, proceed to [Client Setup](client.md).
