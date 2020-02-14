# Faasm.js - Offloading PoC

The aim of this project is to create a shared execution environment that
spans the browser and an underlying [Faasm](https://github.com/lsds/Faasm) 
cluster. This means the _same_ functions can be executed in _both_ 
environments without modification. 

Faasm provides lightweight isolation based on WebAssembly, hence the 
existing runtime and browser environments are not dissimilar. With some extra
abstraction and a new communication layer in the browser, we can create 
seamless interoperation between the two. 

This PoC demonstrates the following:

- Execution of unmodified Faasm functions in the browser
- Chaining of function calls from the browser into an underlying Faasm cluster
- Sharing state between the browser and the cluster

Below is a "quick start" guide followed by a discussion of the implementation 
and challenges.

## Caveats

There are a few caveats to be aware of before looking into the code:

- When dealing with WebAssembly there's _a lot_ of fiddling with byte arrays
- C++ code has lots of casting to and from `uint8_t`
- Javascript code makes heavy use of [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array). 
- The C++ code uses the low-level Faasm API involving lots of byte arrays. This be made _much_ nicer
- There's an inherent mismatch between asynchronous JS and synchronous WebAssembly (see section below)  

## Quick Start

_Note: this requires Docker, docker-compose, Node.js and npm._

To run the PoC:

```bash
# Install the deps
npm install

# Run Faasm
npm run faasm

# Start the demo app
npm start
```

If you visit `http://localhost:3000` you should see a page with some links, 
one to the "Hello" function. Visit this page in the latest Chrome and have
the console open and you should see the messages. 

## Experimental WebAssembly features

Faasm uses some experimental WASM features, to make sure your browser can 
support them all, you'll need to use the latest Chrome and enable them:

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

# PoC Discussion

## Execution Model

Faasm functions make "chained" calls to other functions to perform parallel
processing and offload work. This chaining is fundamental to implementing more 
complex serverless applications and is a key part of the Faasm runtime. 

In the browser-based context we have a single Faasm function written as a WebAssembly 
binary, executing in a Javascript Web Worker. This makes chained calls over the 
network to an underlying Faasm cluster. Functions in the cluster can then make further 
chained calls.

The browser-based function is free to await the results of these chained calls, or 
to continue its execution. 

## Interaction Between Browser and Cluster

At the moment the interaction between the browser and underlying Faasm cluster 
is done with HTTP requests (using synchronous `XmlHttpRequest`s in Javascript). 
The use of HTTP is inefficient and could be replaced with something more 
lightweight (e.g. WebSockets), and synchronous requests from Javascript are 
now deprecated.

Unfortunately Javascript is fundamentally _asynchronous_, while much of the C++ code
we compile to WebAssembly is fundamentally _synchronous_. In addition, many interactions 
between the browser and underlying Faasm cluster are also synchronous (e.g. transferring 
state, awaiting chained functions). Creating a smooth link between synchronous WebAssembly
and asynchronous Javascript is the goal of 
[Asyncify](https://kripken.github.io/blog/wasm/2019/07/16/asyncify.html) and future 
work would require integrating this into Faasm.js.

For now we can execute blocking Faasm functions in their own WebWorker, hence not 
impacting the main browser thread. There is undoubtedly a cleaner, more efficient 
way to do this. Faasm's function chaining model can actually be synchronous or 
asynchronous, supporting a fork-join approach as well as synchronous call-and-wait.

## Host Interface

Faasm functions are written against the Faasm host interface. This allows functions 
to interact with the underlying runtime to perform serverless-specific tasks like 
handling state or chaining functions. This also includes a small subset of normal 
POSIX-like syscalls (e.g. `mmap`).

This interface is primarily designed for a server-side context, but we can support 
Faasm functions in the browser by implementing a subset in Javascript (see 
[faasm.js](https://github.com/Shillaker/faasmjs/blob/master/public/javascripts/faasm/faasm.js)).

## Sharing State

Faasm functions within a cluster are able to share state via regions of shared 
memory and Faasm's two-tier state architecture. This kind of sharing cannot
be done between functions in the cluster and functions in the browser. To solve
this Faasm.js will push and pull data to and from the cluster as necessary 
over HTTP. 

This is inefficient but works for now. The consideration of what data should 
live in the browser and what should live in the Faasm cluster is application-specific
and down to the user.

## Emscripten and WASI

Faasm defines its own custom host interface, hence has some overlap with 
WASI but also defines lots of its own serverless-specific functions (e.g.
for managing state and function chaining). For this reason Faasm doesn't
currently support WASI- or Emscripten-compiled binaries, but could do in the 
future. 

