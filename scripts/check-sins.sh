#!/bin/bash
set -e

echo "Checking for sins..."

# 1. Check for eslint-disable and friends
# 1. Check for eslint-disable and friends
if grep -rE "eslint-disable|@ts-ignore|@ts-nocheck|@ts-expect-error" src/; then
  echo "Found sins! Please remove them."
  exit 1
fi

# 2. Check for mutability (let/var) is handled by ESLint now!

# 3. Check for empty catches
# This regex looks for catch followed by optional (error) then { optional whitespace }
if grep -rE "catch\s*(\(.*\))?\s*\{\s*\}" src/; then
   echo "Found empty catches! Catches must handle errors or log them."
   exit 1
fi

echo "No sins found!"

# 2. Check for large files (>100 lines) - Warning only per user request
limit=100
large_files=$(find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk -v limit=$limit '$1 > limit && $2 != "total" {print $2 ": " $1 " lines"}')

if [ ! -z "$large_files" ]; then
  echo ""
  echo "WARNING: The following files exceed $limit lines. Consider abstracting logic:"
  echo "$large_files"
  echo ""
  echo ""
  echo "STRICT MODE: Exiting 1 due to large files."
  exit 1 
fi
