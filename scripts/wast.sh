#!/bin/bash

if [[ -z "$1" ]]; then
  echo "Must provide a wasm file"
  exit 1
fi

WAST_OUT=$1.wast
/faasm/build/third-party/WAVM/bin/wavm disassemble $1 ${WAST_OUT} --enable simd

echo ".wast file at ${WAST_OUT}"
