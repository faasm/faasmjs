let w = new Worker("/javascripts/faasm/faasm.js");

w.postMessage(["chain", "/wasm/chain.wasm"]);

w.onmessage = function(res) {
    console.log(res.data);
};