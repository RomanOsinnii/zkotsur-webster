#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
GITHUB_ACTOR_NAME="${GITHUB_ACTOR_NAME:-unknown}"
GITHUB_SHA_FULL="${GITHUB_SHA_FULL:-unknown}"
GITHUB_REF_NAME_VALUE="${GITHUB_REF_NAME_VALUE:-unknown}"
GITHUB_REPOSITORY_NAME="${GITHUB_REPOSITORY_NAME:-unknown}"
GITHUB_SERVER_URL_VALUE="${GITHUB_SERVER_URL_VALUE:-https://github.com}"
GITHUB_RUN_ID_VALUE="${GITHUB_RUN_ID_VALUE:-}"
GITHUB_RUN_NUMBER_VALUE="${GITHUB_RUN_NUMBER_VALUE:-}"
GITHUB_COMMIT_MESSAGE="${GITHUB_COMMIT_MESSAGE:-No commit message provided}"

cd "$PROJECT_DIR"

SHORT_SHA="${GITHUB_SHA_FULL:0:7}"
RUN_URL="${GITHUB_SERVER_URL_VALUE}/${GITHUB_REPOSITORY_NAME}/actions/runs/${GITHUB_RUN_ID_VALUE}"

send_telegram_message() {
  local message="$1"

  if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    return 0
  fi

  curl -fsSL -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" \
    --data-urlencode "disable_web_page_preview=true" >/dev/null
}

on_error() {
  send_telegram_message "Webster deploy failed

Repository: ${GITHUB_REPOSITORY_NAME}
Branch: ${GITHUB_REF_NAME_VALUE}
Commit: ${SHORT_SHA}
Triggered by: ${GITHUB_ACTOR_NAME}
Host: $(hostname)
Run: #${GITHUB_RUN_NUMBER_VALUE}
${RUN_URL}"
}

trap on_error ERR

send_telegram_message "Webster deploy started

Repository: ${GITHUB_REPOSITORY_NAME}
Branch: ${GITHUB_REF_NAME_VALUE}
Commit: ${SHORT_SHA}
Triggered by: ${GITHUB_ACTOR_NAME}
Message: ${GITHUB_COMMIT_MESSAGE}
Host: $(hostname)
Run: #${GITHUB_RUN_NUMBER_VALUE}
${RUN_URL}"

docker compose up --build -d

trap - ERR

send_telegram_message "Webster deploy completed

Repository: ${GITHUB_REPOSITORY_NAME}
Branch: ${GITHUB_REF_NAME_VALUE}
Commit: ${SHORT_SHA}
Triggered by: ${GITHUB_ACTOR_NAME}
Host: $(hostname)
Run: #${GITHUB_RUN_NUMBER_VALUE}
${RUN_URL}"
