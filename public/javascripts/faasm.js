// This will get set to the memory that is exported by the wasm module.
let wasmMemory = null;
let wasmOutput = null;

// --------------------------------------------------
// UTILITIES
// --------------------------------------------------

function getStringFromWasm(offset, len) {
    // Get the output bytes from the wasm memory
    const view = new Uint8Array(wasmMemory.buffer, offset, len);

    // Convert to a JS string
    let dec = new TextDecoder("utf-8");
    return dec.decode(view);
}

// --------------------------------------------------
// HOST INTERFACE
// --------------------------------------------------

/**
 * Used to implement chaining on server-side. Not used on client-side.
 */
function __faasm_get_idx() {
    console.log("wasm: __faasm_get_idx");
    // This will always be zero in the browser env
    return 0;
}

/**
 * Writes the function's output
 * @param offset - pointer to the function's output
 * @param len - length of the output
 */
function __faasm_write_output(offset, len) {
    console.log("wasm: __faasm_write_output(" + offset + ")");
    wasmOutput = getStringFromWasm(offset, len);
}

// --------------------------------------------------
// WASM EXECUTION
// --------------------------------------------------

let importObject = {
    imports: {},
    env: {
        __faasm_get_idx: __faasm_get_idx,
        __faasm_write_output: __faasm_write_output,
    }
};

// Instantiate the module
let module = WebAssembly.instantiateStreaming(fetch('/wasm/hellojs.wasm'), importObject);

// Call the exported function
module.then(wasmModule => {
    let instance = wasmModule.instance;

    // Get a reference to the created memory
    wasmMemory = instance.exports.memory.buffer;

    // Invoke the main function
    instance.exports.main();

    // Log any output from the function
    console.log("Wasm output: " + wasmOutput);
});