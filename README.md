# Faasm.js

Browser offloading with Faasm and WebAssembly.

[Faasm](https://github.com/lsds/Faasm) is a high-performance stateful 
serverless runtime that can be integrated into other serverless platforms 
such as [KNative](https://knative.dev/).

Faasm uses WebAssembly as part of its isolation environment, hence it is 
possible to interface easily with WebAssembly code executing in a browser. 
This makes it easy to seamlessly offload work from the browser into a 
serverless environment, sharing data and code between the two.

## Quick Start

Before you start you must have installed Docker, docker-compose, Node.js and npm.

You can start a containerised Faasm instance locally by running:

```bash
npm run faasm
```

You can then run the simple app:

```bash
node app.js
```

## Building WebAssembly

To build WebAssembly binaries we use the Faasm toolchain container. 
This uses vanilla LLVM 9 with some extra libraries compiled to run in the 
Faasm environment.

To start the toolchain container you can run:

```bash
npm run toolchain
```

From the resulting prompt you can invoke the wasm build with:

```bash
./scripts/build_wasm.sh
```

The resulting WebAssembly files are placed in the `public/wasm` directory.

## Uploading functions to Faasm

To offload work to Faasm, you need to upload your function code. This can 
be done with:

```
npm run upload -- <func name> <your file>
```

For the `hellojs` example this would be:

```
npm run upload -- hellojs public/wasm/hellojs.wasm
```

