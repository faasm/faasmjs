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

_Note: this requires Docker, docker-compose, Node.js and npm._

This PoC uses Express.js and can be set up with: 

```bash
npm install
```

You can then start a containerised Faasm instance locally by running:

```bash
npm run faasm
```

You can start the sample app with:

```bash
npm start
```

If you visit `http://localhost:3000` you should see a page with a couple 
of links, one to the "Hello" function. The internals of this are 
explained on the page itself.

## Experimental WebAssembly features

Faasm uses some experimental WASM features, to make sure your browser can 
support them all, you'll need to **use the latest Chrome** and enable them:

- Go to `chrome://flags`
- Enable "Experimental WebAssembly" and "WebAssembly SIMD support" 

## Building WebAssembly

To build WebAssembly binaries we use the Faasm toolchain container 
(`faasm/toolchain`). This is just a pre-built LLVM 9 with some libraries 
compiled to WebAssembly to run in the Faasm environment.

To start the toolchain container you can run:

```bash
npm run toolchain
```

From the resulting prompt you can invoke the wasm build for the functions 
in the `func` dir with:

```bash
./scripts/build_wasm.sh
```

The resulting WebAssembly files are placed in the `public/wasm` directory 
(where they can be loaded from the browser).

To see the text representation of the `.wasm` files, you can either use 
the Chrome debugger, or run the following script from within the Faasm 
toolchain container:

```bash
./scripts/wast.sh <path to wasm file>
```

E.g. 

```bash
./scripts/wast.sh public/wasm/hellojs.wasm
```

## Uploading functions to Faasm

To offload work to Faasm, the functions must also be uploaded to the Faasm 
instance. To do this you can run the following (provided you've built the 
functions as described above):

```
npm run upload -- <func name> <your file>
```

For the `hellojs` example this would be:

```
npm run upload -- hellojs public/wasm/hellojs.wasm
```

These are uploaded to Faasm under the `faasmjs` user.  

## Emscripten and WASI

Faasm defines its own custom host interface, hence has some overlap with 
WASI but also defines lots of its own serverless-specific functions (e.g.
for managing state and function chaining). For this reason Faasm doesn't
currently support WASI- or Emscripten-compiled binaries, but could do in the 
future. 
