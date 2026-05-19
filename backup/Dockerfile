## Nightly pg_dump backup runner.
## Writes timestamped dumps to /backups, retains last $RETENTION_DAYS days.
FROM postgres:16-alpine
RUN apk add --no-cache dcron
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/backup.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
