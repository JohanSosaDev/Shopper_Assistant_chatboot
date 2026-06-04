#!/bin/sh
set -e

echo "=== Hermes startup ==="

echo "Running migrations..."
node dist/migrate.js

echo "Running seed..."
node dist/seed.js

echo "Starting Hermes server..."
exec node dist/server.js
