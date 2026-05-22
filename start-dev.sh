#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://postgres.hojpkyszlbjkscbwquuz:3lolScar%4025%23@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.hojpkyszlbjkscbwquuz:3lolScar%4025%23@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
exec npx next dev -p 3000
