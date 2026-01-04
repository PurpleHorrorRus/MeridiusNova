#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
	chown -R node:node /home/node/.meridius 2>/dev/null || true
	exec su-exec node "$@"
else
	exec "$@"
fi