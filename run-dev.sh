#!/bin/bash
cd /home/z/my-project

# Override system DATABASE_URL
export DATABASE_URL="postgresql://postgres.hojpkyszlbjkscbwquuz:3lolScar%4025%23@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.hojpkyszlbjkscbwquuz:3lolScar%4025%23@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

while true; do
  echo "[run-dev] Starting Next.js at $(date)" >> /home/z/my-project/dev.log
  node node_modules/.bin/next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev.log
  EXIT_CODE=$?
  echo "[run-dev] Server exited with code $EXIT_CODE at $(date)" >> /home/z/my-project/dev.log
  echo "[run-dev] Restarting in 3 seconds..."
  sleep 3
done
