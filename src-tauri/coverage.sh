#!/usr/bin/env bash
set -euo pipefail

# Ensure we are in the correct directory (src-tauri)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Rust Backend Coverage Suite ==="

# Check if rustup is installed
if ! command -v rustup &> /dev/null; then
    echo "Error: rustup is not installed." >&2
    exit 1
fi

# Check for llvm-tools-preview
if ! rustup component list --installed | grep -q "llvm-tools-preview"; then
    echo "Installing llvm-tools-preview component..."
    rustup component add llvm-tools-preview
fi

# Check for cargo-llvm-cov
if ! cargo llvm-cov --version &> /dev/null; then
    echo "Installing cargo-llvm-cov..."
    cargo install cargo-llvm-cov
fi

# Parse arguments
MODE="text"
OPEN_REPORT=false

for arg in "$@"; do
    case $arg in
        --html)
            MODE="html"
            ;;
        --lcov)
            MODE="lcov"
            ;;
        --open)
            MODE="html"
            OPEN_REPORT=true
            ;;
        --help|-h)
            echo "Usage: ./coverage.sh [options]"
            echo "Options:"
            echo "  --html    Generate HTML report in target/llvm-cov/html"
            echo "  --lcov    Generate LCOV report at lcov.info"
            echo "  --open    Generate HTML report and open it in the default browser"
            echo "  -h, --help Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Run with -h or --help for usage."
            exit 1
            ;;
    esac
done

if [ "$MODE" = "text" ]; then
    echo "Running coverage with text output..."
    cargo llvm-cov
elif [ "$MODE" = "html" ]; then
    echo "Generating HTML coverage report..."
    if [ "$OPEN_REPORT" = true ]; then
        cargo llvm-cov --html --open
    else
        cargo llvm-cov --html
        echo "Report saved to: target/llvm-cov/html/index.html"
    fi
elif [ "$MODE" = "lcov" ]; then
    echo "Generating LCOV coverage report..."
    cargo llvm-cov --lcov --output-path lcov.info
    echo "LCOV report saved to: lcov.info"
fi
