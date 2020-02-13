#!/bin/bash

# This gets executed inside the Faasm toolchain container

# We currently assume the Faasm codebase is checked out at
# /usr/local/code/faasm as it is in the toolchain container
TOOLCHAIN_FILE=/usr/local/code/faasm/toolchain/FaasmToolchain.cmake

# Run CMake build for the functions
mkdir -p func/build
pushd func/build >> /dev/null

cmake -GNinja \
    -DCMAKE_TOOLCHAIN_FILE=${TOOLCHAIN_FILE} \
    ..

ninja

# Copy the wasm files into place
cp *.wasm ../../public/wasm

popd >> /dev/null


