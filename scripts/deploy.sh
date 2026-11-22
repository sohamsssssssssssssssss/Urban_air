#!/usr/bin/env bash
# Idempotent deploy of SmogSense to Google Cloud Run (asia-south1). Keys go to Secret Manager and are
# mounted with --set-secrets; they are never passed as plain env vars or baked into the image.
# Usage: PROJECT_ID=my-project ./scripts/deploy.sh   (reads keys from .env.local)
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-smogsense}"
ENV_FILE="${ENV_FILE:-.env.local}"
# "ENV_KEY:secret-name" pairs (no associative arrays: macOS ships bash 3.2)
SECRETS="OPENAQ_API_KEY:smogsense-openaq-key DATA_GOV_IN_API_KEY:smogsense-datagov-key GEMINI_API_KEY:smogsense-gemini-key"

[[ -n "$PROJECT_ID" ]] || { echo "Set PROJECT_ID or run: gcloud config set project <id>"; exit 1; }
gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q . || { echo "Not authenticated: run 'gcloud auth login'"; exit 1; }
[[ -f "$ENV_FILE" ]] || { echo "$ENV_FILE not found"; exit 1; }
echo "Deploying $SERVICE to project $PROJECT_ID ($REGION)"

gcloud services enable run.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$PROJECT_ID"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${RUNTIME_SA:-${PROJECT_NUMBER}-compute@developer.gserviceaccount.com}" # Cloud Run default identity

SET_SECRETS=()
for pair in $SECRETS; do
  key="${pair%%:*}"; secret="${pair##*:}"
  value="$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r')"
  [[ -n "$value" ]] || { echo "skip $key (empty in $ENV_FILE)"; continue; }
  if gcloud secrets describe "$secret" --project "$PROJECT_ID" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$secret" --data-file=- --project "$PROJECT_ID" >/dev/null
  else
    printf '%s' "$value" | gcloud secrets create "$secret" --data-file=- --replication-policy=automatic --project "$PROJECT_ID" >/dev/null
  fi
  gcloud secrets add-iam-policy-binding "$secret" --member "serviceAccount:${RUNTIME_SA}" --role roles/secretmanager.secretAccessor --project "$PROJECT_ID" >/dev/null
  SET_SECRETS+=("${key}=${secret}:latest")
done
[[ ${#SET_SECRETS[@]} -gt 0 ]] || { echo "No keys found; refusing to deploy a service with no data source"; exit 1; }

gcloud run deploy "$SERVICE" --source . --project "$PROJECT_ID" --region "$REGION" \
  --allow-unauthenticated --memory 512Mi --min-instances 0 --max-instances 3 \
  --set-secrets "$(IFS=,; echo "${SET_SECRETS[*]}")"

gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)'
