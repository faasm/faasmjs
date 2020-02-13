#include "faasm/faasm.h"
#include "string.h"

/**
 * Chained function that will get invoked on the server
 */
FAASM_FUNC(1) {
    const char* input = faasm::getStringInput("No input");
    printf("Faasmjs sent me: %s\n", input);

    return 0;
}

/**
 * Main function that will execute in the browser
 */
FAASM_MAIN_FUNC() {
    const char* chainInput = "Hi from the client";
    unsigned int callId = faasmChainThisInput(1, (uint8_t *) chainInput, strlen(chainInput));

    unsigned int result = faasmAwaitCall(callId);

    if(result != 0) {
        const char *message = "Chained call failed";
        faasmSetOutput((uint8_t *)message, strlen(message));
        return 1;
    }

    const char *message = "Chained call successful";
    faasmSetOutput((uint8_t *) message, strlen(message));
    return 0;
}
