cmake_minimum_required(VERSION 3.8.0)
project(faasmjs)

set(CMAKE_CXX_STANDARD 17)

SET(CMAKE_EXE_LINKER_FLAGS "\
    -Xlinker --no-entry \
    -Xlinker --stack-first \
    -Xlinker --export=main \
    -Xlinker --export=_faasm_zygote \
    -Xlinker --max-memory=4294901760 \
    -Wl,-z,stack-size=4194304 -Wl, \
")

SET(CMAKE_EXECUTABLE_SUFFIX ".wasm")

function(faasm_func func_name file_name)
    add_executable(${func_name} ${file_name})
    target_link_libraries(${func_name} faasm dlmalloc)
endfunction(faasm_func)

faasm_func(hellojs hellojs.cpp)
faasm_func(chain chain.cpp)
faasm_func(state state.cpp)