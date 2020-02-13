#!/bin/bash

# Uploads the given wasm file to a Faasm instance

# Assume localhost
FAASM_HOST=localhost
FAASM_PORT=8002

if [[ -z "$1" ]]; then
  echo "Must provide a function name"
  exit 1
fi

if [[ -z "$2" ]]; then
  echo "Must provide a function file"
  exit 1
fi

FUNC_NAME=$1
WASM_FILE=$2

curl -X PUT http://${FAASM_HOST}:${FAASM_PORT}/f/faasmjs/${FUNC_NAME} -T ${WASM_FILE}

