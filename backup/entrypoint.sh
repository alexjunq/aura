#!/bin/sh
set -e

# Schedule the nightly dump at 03:30 UTC.
echo "30 3 * * * /usr/local/bin/backup.sh >> /var/log/aura-backup.log 2>&1" \
  > /etc/crontabs/root

# Print a hint to the runtime logs so operators know it's alive.
echo "aura-backup: scheduled 03:30 UTC daily; retention=${RETENTION_DAYS:-14}d"
mkdir -p /backups

# Run cron in foreground.
exec crond -f -l 8
