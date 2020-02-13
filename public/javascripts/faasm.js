// Wasm-related globals
let wasmMemory = null;
let wasmOutput = null;
let wasmInput = null;
let wasmInputLen = null;

// Faasm-related globals (defaults)
// TODO - make this configurable
let faasmHost = "localhost";
let faasmInvokePort = 8080;
let faasmUploadPort = 8002;
let faasmInvokeUrl = "http://" + faasmHost + ":" + faasmInvokePort;
let faasmUser = "faasmjs";
let faasmFunc = null;

// --------------------------------------------------
// UTILITIES
// --------------------------------------------------

/**
 * Extracts a string from wasm memory
 * @param offset - the offset in the wasm memory
 * @param len - the length of the string (optional)
 * @returns {string} - Javascript version of the string
 */
function getStringFromWasm(offset, len) {
    if (!len) {
        // TODO - handle arbitrary lengths. This will be easier with newer JS/ wasm features
        len = 100;
    }

    // Get the output bytes from the wasm memory
    const view = new Uint8Array(wasmMemory, offset, len);

    // Convert to a JS string
    let dec = new TextDecoder();
    return dec.decode(view);
}

/**
 * Writes a string into wasm memory
 * @param stringIn - string to be written
 * @param offset - offset at which to be written in wasm memory
 * @param len - length of the string
 */
function writeStringToWasm(stringIn, offset, len) {
    // Get the buffer in which to write the data
    const view = new Uint8Array(wasmMemory, offset, len);

    // Convert the JS string to bytes and write to the wasm memory
    let enc = new TextEncoder();
    enc.encodeInto(stringIn, view);
}

/**
 * Posts JSON data to a url
 */
async function postDataAsync(url, data) {
    let response = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "text/plain",
            "Content-Type": "application/json",
        },
        data: JSON.stringify(data)
    });

    if(!response.ok) {
        console.error("Failed to POST to " + url);
    }

    return await response.text();
}

function postDataSync(url, data) {
    // TODO - make requests to the server asynchronous
    // The major problem here is that the C++ code itself is *not* asynchronous
    // so if we start making asynchronous calls in the JS it really messes
    // things up.
    let request = new XMLHttpRequest();
    request.open("POST", url, false);
    request.send(JSON.stringify(data));

    return request.responseText;
}

// --------------------------------------------------
// HOST INTERFACE
// --------------------------------------------------

/**
 * Used to implement chaining on server-side. Not used on client-side.
 */
async function __faasm_get_idx() {
    console.log("wasm: __faasm_get_idx");
    // This will always be zero in the browser env
    return 0;
}

/**
 * Writes the function's output
 * @param offset - pointer to the function's output
 * @param len - length of the output
 */
async function __faasm_write_output(offset, len) {
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
async function __faasm_read_input(offset, len) {
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
async function __faasm_chain_this(idx, inputData, inputDataLen) {
    console.log("wasm: __faasm_chain_this(" + idx + ", " + inputData + ", " + inputDataLen + ")");

    // Extract the input data from the wasm
    let inputDataStr = getStringFromWasm(inputData, inputDataLen);

    // Build the invocation JSON. Requests here are always asynchronous.
    // The calling function must await the result.
    let data = {
        user: faasmUser,
        function: faasmFunc,
        index: idx,
        input_data: inputDataStr,
        async: true,
    };

    // Submit the request
    let responseBody = await postDataAsync(faasmInvokeUrl, data);

    // Return the call ID
    let callId = parseInt(responseBody);
    console.log("Chained call ID " + callId);

    return callId;
}

/**
 * Awaits the completion of a chained function
 *
 * @param callId - the ID of the chained call
 */
async function __faasm_await_call(callId) {
    console.log("wasm: __faasm_await_call(" + callId + ")");

    // TODO - come up with a better way than polling
    let pollCount = 0;
    let success = doAwait(callId);
    while(pollCount < 10 && !success) {
        await setTimeout(() => {
            success = doAwait(callId);
            pollCount++;
        }, 500);
    }

    return 0;
}

async function doAwait(callId) {
    let data = {
        id: callId,
        status: true,
    };

    let responseBody = await postDataAsync(faasmInvokeUrl, data);
    if(responseBody.startsWith("SUCCESS")) {
        console.log("Chained call " + callId + " succeeded.");
        return true;
    } else if(responseBody.startsWith("FAILED")) {
        console.error("Chained call " + callId + " failed.");
        return true;
    } else {
        console.log("Chained call " + callId + " running.");
        return false;
    }
}

async function puts(offset) {
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
async function __syscall1(syscallNo, a) {
    return __syscall6(syscallNo, a, null, null, null, null, null);
}

async function __syscall2(syscallNo, a, b) {
    return __syscall6(syscallNo, a, b, null, null, null, null);
}

async function __syscall3(syscallNo, a, b, c) {
    return __syscall6(syscallNo, a, b, c, null, null, null);
}

async function __syscall4(syscallNo, a, b, c, d) {
    return __syscall6(syscallNo, a, b, c, d, null, null);
}

async function __syscall5(syscallNo, a, b, c, d, e) {
    return __syscall6(syscallNo, a, b, c, d, e, null);
}

async function __syscall6(syscallNo, a, b, c, d, e, f) {
    console.log("wasm: syscall(" + syscallNo + ")");

    switch(syscallNo) {
        case 1:
            // Exit
            throw "Wasm calling exit";
        case 54:
            // ioctl (can ignore)
            return 0;
        case 146:
            // writev
            throw "Not yet implemented writev. Avoid using formatted printf strings in the client";
        default:
            // We need to bomb out here if the code is invoking a syscall we don't support
            throw "Unimplemented syscall: " + syscallNo;
    }

    return 0;
}

/**
 * getrlimit function (unimplemented)
 */
async function getrlimit(a, b) {
    console.log("wasm: getrlimit(" + a + ", " + b + ")");
    return 0;
}

// --------------------------------------------------
// WASM EXECUTION
// --------------------------------------------------

async function runFaasmFunc(funcName, wasmUrl, input, inputLen) {
    faasmFunc = funcName;

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
    await module.then(wasmModule => {
        let instance = wasmModule.instance;

        // Get a reference to the created memory
        wasmMemory = instance.exports.memory.buffer;

        // Invoke the main function
        instance.exports.main();

        // Log any output from the function
        console.log("Wasm output: " + wasmOutput);
    });

    return 0;
}

export {runFaasmFunc}