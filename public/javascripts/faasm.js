// This will get set to the memory that is exported by the wasm module.
let wasmMemory = null;
let wasmOutput = null;
let wasmInput = null;
let wasmInputLen = null;

// --------------------------------------------------
// UTILITIES
// --------------------------------------------------

function getStringFromWasm(offset, len) {
    if(!len) {
        // TODO - handle arbitrary lengths. This will be easier with newer JS/ wasm features
        len = 100;
    }

    // Get the output bytes from the wasm memory
    const view = new Uint8Array(wasmMemory, offset, len);

    // Convert to a JS string
    let dec = new TextDecoder();
    return dec.decode(view);
}

function writeStringToWasm(stringIn, offset, len) {
    // Get the buffer in which to write the data
    const view = new Uint8Array(wasmMemory, offset, len);

    // Convert the JS string to bytes
    let enc = new TextEncoder();
    return enc.encodeInto(stringIn, view);
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

/**
 * Reads the function's input into the given buffer.
 *
 * If the length of the buffer is zero we should return the input length.
 *
 * @param offset - pointer to the buffer in the function's memory
 * @param len - length of the buffer
 */
function __faasm_read_input(offset, len) {
    console.log("wasm: __faasm_read_input(" + offset + ", " + len + ")");

    // TODO - error if sizes of buffer and input are mismatched
    if (wasmInput == null || wasmInputLen == null) {
        return 0;
    } else if (!len) {
        return wasmInputLen;
    } else {
        writeStringToWasm(wasmInput, offset, len);
        return len;
    }
}

/**
 * Chains a call to the given function by index (i.e. from the same wasm file)
 *
 * @param idx - the index of the function in that source file
 * @param inputData - the input data to pass to the function
 * @param inputDataLen - the length of the input data
 * @returns number - the ID of the chained call
 */
function __faasm_chain_this(idx, inputData, inputDataLen) {
    console.log("wasm: __faasm_chain_this(" + idx + ", " + inputData + ", " + inputDataLen + ")");

    return 0;
}

/**
 * Awaits the completion of a chained function
 *
 * @param callId - the ID of the chained call
 */
function __faasm_await_call(callId) {
    console.log("wasm: __faasm_await_call(" + callId + ")");

    // TODO - implement

    return 0;
}

function puts(offset) {
    let printString = getStringFromWasm(offset, undefined);
    console.log("wasm: \"" + printString + "\"");
    return 0;
}

/**
 * Syscall mapping
 *
 * NOTE - these need to be defined to complete the linking of the wasm module, however,
 * they only need to be _implemented_ if they're actually invoked on the client side.
 *
 * Note that __syscall1 corresponds to a syscall with 1 argument, __syscall2 to a syscall
 * with 2 arguments and so on. The syscallNo indicates which system call is being made.
 *
 * The mapping of syscall numbers can be seen at
 * https://github.com/Shillaker/musl/blob/wasm-prototype-1/arch/wasm32/bits/syscall.h.in
 */
function __syscall1(syscallNo, a) {
    return __syscall6(a, null, null, null, null, null, null);
}

function __syscall2(syscallNo, a, b) {
    return __syscall6(a, b, null, null, null, null, null);
}

function __syscall3(syscallNo, a, b, c) {
    return __syscall6(a, b, c, null, null, null, null);
}

function __syscall4(syscallNo, a, b, c, d) {
    return __syscall6(a, b, c, d, null, null, null);
}

function __syscall5(syscallNo, a, b, c, d, e) {
    return __syscall6(a, b, c, d, e, null, null);
}

function __syscall6(syscallNo, a, b, c, d, e, f) {
    console.log("wasm: syscall(" + syscallNo + ")");

    // TODO - implement any necessary syscalls

    return 0;
}

/**
 * getrlimit function (unimplemented)
 */
function getrlimit(a, b) {
    console.log("wasm: getrlimit(" + a + ", " + b + ")");
    return 0;
}

// --------------------------------------------------
// WASM EXECUTION
// --------------------------------------------------

function runFaasmFunc(wasmUrl, input, inputLen) {
    let importObject = {
        imports: {},
        env: {
            __faasm_get_idx: __faasm_get_idx,
            __faasm_write_output: __faasm_write_output,
            __faasm_read_input: __faasm_read_input,
            __faasm_chain_this: __faasm_chain_this,
            __faasm_await_call: __faasm_await_call,
            __syscall1: __syscall1,
            __syscall2: __syscall2,
            __syscall3: __syscall3,
            __syscall4: __syscall4,
            __syscall5: __syscall5,
            __syscall6: __syscall6,
            getrlimit: getrlimit,
            puts: puts
        }
    };

    if (input !== undefined && inputLen !== undefined) {
        wasmInput = input;
        wasmInputLen = inputLen;
    }

    // Instantiate the module
    let module = WebAssembly.instantiateStreaming(fetch(wasmUrl), importObject);

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
}

export {runFaasmFunc}