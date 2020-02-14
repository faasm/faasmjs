# Faasm Offloading PoC

The aim of this project is to create a shared execution environment that
spans the browser and an underlying Faasm cluster. This means the _same_ 
functions can be executed in _both_ environments without modification.

Faasm provides lightweight isolation based on WebAssembly, hence the 
existing runtime and browser environments are not dissimilar. With some extra
abstraction and a new communication layer in the browser, we can create 
seamless interoperation between the two. 

This PoC demonstrates the following:

- Execution of unmodified Faasm functions in the browser
- Chaining of function calls from the browser into an underlying Faasm cluster
- Sharing state between the browser and the cluster

Below is a discussion of the implementation and challenges.

## Execution Model

Faasm functions make "chained" calls to other functions to perform parallel
processing and offload work. This chaining is fundamental to implementing more 
complex serverless applications and is a fundamental part of the Faasm runtime. 

In the browser-based context we have a single Faasm function executing in a 
Javascript Web Worker, which makes chained calls over the network to an underlying
Faasm cluster. These functions can themselves make further chained calls within the
cluster.

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
impacting the main browser thread, but there is undoubtedly a cleaner, more efficient 
way to do this. Faasm's function chaining model can actually be synchronous or 
asynchronous, supporting a fork-join approach as well as synchronous call-and-block.

## Host Interface

Faasm functions are written against the Faasm host interface. This allows functions 
to interact with the underlying runtime to perform serverless-specific tasks like 
handling state or chaining functions. This also includes a small subset of normal 
POSIX-like syscalls (e.g. `mmap`).

This interface is primarily designed for a server-side context, but we can support 
Faasm functions in the browser by implementing a subset in Javascript (see 
`public/javascripts/faasm/faasm.js`).

## Sharing State

Faasm functions within a cluster are able to share state via regions of shared 
memory and Faasm's two-tier state architecture. This kind of sharing cannot
be done between functions in the cluster and functions in the browser. To solve
this Faasm.js will push and pull data to and from the cluster as necessary 
over HTTP. 

This is inefficient but works for now. The consideration of what data should 
live in the browser and what should live in the Faasm cluster is application-specific
and down to the user.