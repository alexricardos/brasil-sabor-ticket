#!/bin/sh
set -eu
cd "$(dirname "$0")"
temp=$(mktemp -d)
trap 'rm -f "$temp/"*; rmdir "$temp"' EXIT
for target in 32 64; do
    {
        printf '%s\n' 'LIBRARY KERNEL32.dll' EXPORTS
        for symbol in GetModuleFileNameW:12 SetCurrentDirectoryW:4 CreateProcessW:40 WaitForSingleObject:8 GetExitCodeProcess:8 CloseHandle:4 ExitProcess:4; do
            name=${symbol%:*}
            if [ "$target" = 32 ]; then
                printf '%s@%s\n' "$name" "${symbol#*:}"
            else
                printf '%s\n' "$name"
            fi
        done
    } >"$temp/kernel.def"
    if [ "$target" = 32 ]; then
        machine=i386
        triple=i686
        linker=i386pe
        entry=_entry
        suffix=-32
    else
        machine=i386:x86-64
        triple=x86_64
        linker=i386pep
        entry=entry
        suffix=
    fi
    "${LLVM_DLLTOOL:-llvm-dlltool}" -k -m "$machine" -d "$temp/kernel.def" -l "$temp/kernel.lib"
    clang -target "$triple-pc-windows-msvc" -ffreestanding -fno-stack-protector -Oz -c windows.c -o "$temp/launcher.obj"
    ld -m "$linker" --subsystem console:6.1 -e "$entry" "$temp/launcher.obj" "$temp/kernel.lib" -o "../iniciaTrilhosDoCerrado$suffix.exe"
done
