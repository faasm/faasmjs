#include "faasm/faasm.h"
#include "faasm/input.h"

#include <string>
#include <stdio.h>

#define STATE_KEY "state_example"
#define STATE_LEN 16

/**
 * Executes in the Faasm instance.
 */
FAASM_FUNC(other, 1) {
    const char* expected = "I am the client";

    // Pull the current state value
    faasmPullState(STATE_KEY, STATE_LEN);
    char actual[STATE_LEN];
    faasmReadState(STATE_KEY, (uint8_t*)actual, STATE_LEN);

    if(strcmp(actual, expected) != 0) {
        printf("Unexpected state value: %s (expected %s)\n", actual, expected);
        return 1;
    }

    // Push a new value
    const char* newValue = "I am the server";
    faasmWriteState(STATE_KEY, (uint8_t*) newValue, STATE_LEN);
    faasmPushState(STATE_KEY);

    return 0;
}

/**
 * Executes in the browser.
 */
FAASM_MAIN_FUNC() {
    // Write some bytes to shared state
    const char* initialState = "I am the client";
    faasmWriteState(STATE_KEY, (uint8_t*) initialState, STATE_LEN);
    faasmPushState(STATE_KEY);

    // Make the chained call and await
    unsigned int callId = faasmChainThisInput(1, nullptr, 0);
    if(faasmAwaitCall(callId) != 0) {
        return 1;
    };

    // Pull the latest
    faasmPullState(STATE_KEY, STATE_LEN);

    // Set as the output
    char actual[STATE_LEN];
    faasmReadState(STATE_KEY, (uint8_t*) actual, STATE_LEN);
    faasmSetOutput((uint8_t*) actual, STATE_LEN);

    return 0;
}
