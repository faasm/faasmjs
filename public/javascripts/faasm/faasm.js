// Faasm-related globals (defaults)
// TODO - make this configurable
let faasmHost = "localhost";
let faasmInvokePort = 8080;
let faasmUploadPort = 8002;
let faasmInvokeUrl = "http://" + faasmHost + ":" + faasmInvokePort;
let faasmUploadUrl = "http://" + faasmHost + ":" + faasmUploadPort;
let faasmUser = "faasmjs";
let faasmFunc = null;

// Wasm-related globals
let wasmMemory = null;
let wasmOutput = null;
let wasmInput = null;
let wasmInputLen = null;

// Object to store Faasm state in browser memory
let faasmState = {};

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
    // Handle unspecified length
    // TODO - improve this handling of null-terminated strings
    let isNullTerminated = false;
    if (!len) {
        isNullTerminated = true;
        len = 50;
    }

    // Get the output bytes from the wasm memory
    const view = new Uint8Array(wasmMemory, offset, len);

    // Convert to a JS string
    let dec = new TextDecoder();
    let result = dec.decode(view);

    if(isNullTerminated) {
        result = result.split("\0").shift();
    }

    return result;
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
    let request = new XMLHttpRequest();
    request.open("POST", url, false);
    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Accept", "text/plain");
    request.send(JSON.stringify(data));

    return request.responseText;
}

function putBinaryDataSync(url, data) {
    let request = new XMLHttpRequest();
    request.open("PUT", url, false);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.setRequestHeader("Accept", "text/plain");
    request.send(data);

    return request.responseText;
}

function getBinaryDataSync(url) {
    let request = new XMLHttpRequest();
    request.open("GET", url, false);
    request.setRequestHeader("Accept", "application/octet-stream");
    request.responseType = "arraybuffer";
    request.send();

    return new Uint8Array(request.response);
}

function getStateUrl(stateKey) {
    return faasmUploadUrl + "/s/" + faasmUser + "/" + stateKey;
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

    // Extract the input data from the wasm
    let inputDataStr = getStringFromWasm(inputData, inputDataLen);

    // Build the invocation JSON.

    // HACK: Usually this would be asynchronous and the calling function
    // would await the result of the chained call. However, in the JS
    // context we have to make this synchronous.
    let data = {
        user: faasmUser,
        function: faasmFunc,
        index: idx,
        input_data: inputDataStr,
        async: false,
    };

    // Submit the request (will block until the function completes)
    postDataSync(faasmInvokeUrl, data);

    // Return a fake call ID (which the function will instantly pass to __faasm_await_call
    return 1234;
}

/**
 * Awaits the completion of a chained function.
 *
 * NOTE: we are currently making the original chaining call synchronously
 * so this should always return "SUCCESS" straight away.
 *
 * @param callId - the ID of the chained call
 */
function __faasm_await_call(callId) {
    console.log("wasm: __faasm_await_call(" + callId + ")");

    // HACK - we are ignoring this because we're making the original chaining
    // call synchronously
    return 0;
}

/**
 * Pulls the state value from the global state store
 * @param keyOffset - the offset of the state key in wasm memory
 * @param len - length of the state value
 */
function __faasm_pull_state(keyOffset, len) {
    let key = getStringFromWasm(keyOffset);
    console.log("wasm: __faasm_pull_state(" + key + ", " + len + ")");

    // Get from remote
    let url = getStateUrl(key);

    // Write to local state
    faasmState[key] = getBinaryDataSync(url);

    return 0;
}

/**
 * Reads a state value referenced by the given state key
 * @param keyOffset - the offset of the state key in wasm memory
 * @param buffer - offset of the buffer in wasm memory
 * @param len - length of the buffer
 */
function __faasm_read_state(keyOffset, buffer, len) {
    let key = getStringFromWasm(keyOffset);
    console.log("wasm: __faasm_read_state(" + key + ", " +  buffer + ", " + len + ")");

    if(!faasmState.hasOwnProperty(key)) {
        __faasm_pull_state(key, len);
    }

    // Set value in wasm memory
    let wasmBuffer = new Uint8Array(wasmMemory, buffer, len);
    wasmBuffer.set(faasmState[key]);

    return 0;
}

/**
 * Writes the given state value to local state
 * @param keyOffset - the offset of the key in wasm memory
 * @param buffer - the offset of the value in wasm memory
 * @param len - the length of the value
 */
function __faasm_write_state(keyOffset, buffer, len) {
    let key = getStringFromWasm(keyOffset);
    console.log("wasm: __faasm_write_state(" + key + ", " +  buffer + ", " + len + ")");

    // Set to local memory
    faasmState[key] = new Uint8Array(wasmMemory, buffer, len);

    return 0;
}

/**
 * Pushes the value from the local state to the global state
 * @param keyOffset - offset of the key in wasm memory
 */
function __faasm_push_state(keyOffset) {
    let key = getStringFromWasm(keyOffset);
    console.log("wasm: __faasm_write_state(" + key + ")");

    // Upload to Faasm state remotely
    let url = getStateUrl(key);
    let localData = faasmState[key];
    putBinaryDataSync(url, localData);

    return 0;
}

/**
 * System call for printing simple (unformatted) strings
 * @param offset - the offset of the string in wasm memory
 */
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
    return __syscall6(syscallNo, a, null, null, null, null, null);
}

function __syscall2(syscallNo, a, b) {
    return __syscall6(syscallNo, a, b, null, null, null, null);
}

function __syscall3(syscallNo, a, b, c) {
    return __syscall6(syscallNo, a, b, c, null, null, null);
}

function __syscall4(syscallNo, a, b, c, d) {
    return __syscall6(syscallNo, a, b, c, d, null, null);
}

function __syscall5(syscallNo, a, b, c, d, e) {
    return __syscall6(syscallNo, a, b, c, d, e, null);
}

function __syscall6(syscallNo, a, b, c, d, e, f) {
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
function getrlimit(a, b) {
    console.log("wasm: getrlimit(" + a + ", " + b + ")");
    return 0;
}

// --------------------------------------------------
// WASM EXECUTION
// --------------------------------------------------

onmessage = function(msg) {
    let funcName = msg.data[0];
    let funcUrl = msg.data[1];
    let input = null;
    let inputLen = null;

    if(msg.data.size > 2) {
        input = msg.data[2];
        inputLen = msg.data[3];

        console.log("Executing " + funcName + " at " + funcUrl + " with input " + input);
    } else {
        console.log("Executing " + funcName + " at " + funcUrl);
    }

    if(runFaasmFunc(funcName, funcUrl, input, inputLen)) {
        let result = "Successfully executed " + funcName;
        postMessage(result);
    } else {
        let result = "Failed to executed " + funcName;
        postMessage(result);
    }
};

function runFaasmFunc(funcName, wasmUrl, input, inputLen) {
    faasmFunc = funcName;

    let importObject = {
        imports: {},
        env: {
            __faasm_get_idx: __faasm_get_idx,
            __faasm_write_output: __faasm_write_output,
            __faasm_read_input: __faasm_read_input,
            __faasm_chain_this: __faasm_chain_this,
            __faasm_await_call: __faasm_await_call,
            __faasm_push_state: __faasm_push_state,
            __faasm_pull_state: __faasm_pull_state,
            __faasm_read_state: __faasm_read_state,
            __faasm_write_state: __faasm_write_state,
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

    if (input && inputLen) {
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
    }).catch(reason => {
        console.error("WASM failed: " + reason);

        return false;
    });

    return true;
}
