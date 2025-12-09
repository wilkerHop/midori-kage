#!/bin/bash
set -e

echo "Checking test coverage..."

# Define source directories
SRC_DIR="extension"
TEST_DIR="tests/extension"

# Find JS files in crucial directories (scripts, popup)
# We exclude files that are just config or assets if any
FILES=$(find "$SRC_DIR" -name "*.js" | grep -v "background.js") 

for FILE in $FILES; do
  # Construct expected test file path
  # e.g. extension/scripts/content.js -> tests/extension/scripts/content.test.js
  REL_PATH=${FILE#$SRC_DIR/}
  TEST_FILE="$TEST_DIR/${REL_PATH%.js}.test.js"
  
  if [ ! -f "$TEST_FILE" ]; then
    echo "Missing test for $FILE"
    echo "Expected: $TEST_FILE"
    exit 1
  fi
done

echo "All crucial files have test suites!"
