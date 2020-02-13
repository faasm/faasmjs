#!/bin/bash

pushd submodules/faasm >> /dev/null

docker-compose up -d

popd >> /dev/null
