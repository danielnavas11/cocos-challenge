#!/bin/bash
set -e

#Load environment variables
. .env

if [ "${USE_LOCAL_BD}" = "true" ]; then
  echo "Running with local database"
  docker compose --env-file .env up --build cocos-api-local
else
  echo "Running with neo database"
  docker compose --env-file .env up --build cocos-api-local
fi
