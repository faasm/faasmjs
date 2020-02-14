let w = new Worker("/javascripts/faasm/faasm.js");

w.postMessage(["hellojs", "/wasm/hellojs.wasm"]);

w.onmessage = function(res) {
    console.log(res.data);
};