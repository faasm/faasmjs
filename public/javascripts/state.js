let w = new Worker("/javascripts/faasm/faasm.js");

w.postMessage(["state", "/wasm/state.wasm"]);

w.onmessage = function(res) {
    console.log(res.data);
};