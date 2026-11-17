#!/bin/bash
set -e

#Load environment variables
. .env

if [ "${USE_LOCAL_BD}" = "true" ]; then
  echo "Running with docker and local database"
  docker compose --env-file .env up --build cocos-api-local
else
  echo "Running without docker and neo database"
  npm run start:dev
fi
