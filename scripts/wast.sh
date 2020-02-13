#!/bin/bash

if [[ -z "$1" ]]; then
  echo "Must provide a wasm file"
  exit 1
fi

/faasm/build/third-party/WAVM/bin/wavm disassemble $1 $1.wast