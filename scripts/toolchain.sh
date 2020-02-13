#!/bin/bash

# Run the Faasm toolchain container

docker run -v $(pwd):/faasmjs \
    -w /faasmjs \
    -it \
    faasm/toolchain:0.0.6 \
    /bin/bash


