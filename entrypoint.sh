#!/bin/sh
# Entrypoint script that verifies VC before starting nginx

echo "Starting VC verification..."

# Run VC verification
python3 /verify_vc.py

# Check exit code
if [ $? -ne 0 ]; then
    echo "VC verification failed. Exiting..."
    exit 1
fi

echo "VC verification passed. Starting nginx..."

# Start nginx
exec nginx -g "daemon off;"
