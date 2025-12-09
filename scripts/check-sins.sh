#!/bin/bash
set -e

echo "Checking for sins..."

# 1. Check for eslint-disable and friends
if grep -rE "eslint-disable|@ts-ignore|@ts-nocheck|@ts-expect-error" extension/; then
  echo "Found sins! Please remove them."
  exit 1
fi

echo "No sins found!"
