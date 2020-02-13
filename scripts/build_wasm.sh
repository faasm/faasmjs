#!/bin/bash

# Use the Faasm toolchain container to build the wasm

docker run \
    -v $(pwd):/usr/local/code/faasm \
    -w /usr/local/code/faasm \
    faasm/toolchain:0.0.6 \
    ./scripts/compile_wasm.sh


