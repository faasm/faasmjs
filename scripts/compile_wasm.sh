#!/bin/bash

# This gets executed inside the Faasm toolchain container

mkdir -p build/wasm

pushd build/wasm >> /dev/null

cmake -GNinja ../../func
ninja

popd >> /dev/null

# TODO - Copy the wasm file into place
