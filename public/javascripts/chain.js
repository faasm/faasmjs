import { runFaasmFunc } from "/javascripts/faasm.js";

runFaasmFunc("chain", "/wasm/chain.wasm").then(res => {
    console.log("Successfully ran chain function");
});
