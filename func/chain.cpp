#include "faasm/faasm.h"
#include "faasm/input.h"

#include <stdio.h>
#include <string.h>

/**
 * Executes in the Faasm instance.
 */
FAASM_FUNC(other, 1) {
    const char* input = faasm::getStringInput("No input");
    printf("Faasmjs sent me: %s\n", input);

    return 0;
}

/**
 * Executes in the browser.
 */
FAASM_MAIN_FUNC() {
    // Make the chained call
    const char* chainInput = "Hi from the client";
    unsigned int callId = faasmChainThisInput(1, (uint8_t *) chainInput, strlen(chainInput));

    // Await the chained call
    if(faasmAwaitCall(callId) != 0) {
        const char *message = "Chained call failed";
        faasmSetOutput((uint8_t *)message, strlen(message));
        return 1;
    }

    // Set output
    const char *message = "Chained call successful";
    faasmSetOutput((uint8_t *) message, strlen(message));
    return 0;
}
