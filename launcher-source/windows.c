typedef unsigned long DWord;
typedef unsigned short Wide;
typedef void *Handle;
typedef int Bool;

typedef struct {
    DWord size;
    Wide *reserved, *desktop, *title;
    DWord x, y, width, height, columns, rows, fill, flags;
    unsigned short show, extraSize;
    unsigned char *extra;
    Handle input, output, error;
} Startup;

typedef struct {
    Handle process, thread;
    DWord processId, threadId;
} Process;

#define IMPORT __declspec(dllimport)
#define WINCALL __stdcall
IMPORT DWord WINCALL GetModuleFileNameW(Handle, Wide *, DWord);
IMPORT Bool WINCALL SetCurrentDirectoryW(const Wide *);
IMPORT Bool WINCALL CreateProcessW(const Wide *, Wide *, void *, void *, Bool, DWord,
                                  void *, const Wide *, Startup *, Process *);
IMPORT DWord WINCALL WaitForSingleObject(Handle, DWord);
IMPORT Bool WINCALL GetExitCodeProcess(Handle, DWord *);
IMPORT Bool WINCALL CloseHandle(Handle);
IMPORT void WINCALL ExitProcess(DWord);

static Wide directory[32768];
static Wide command[] = L"cmd.exe /d /c iniciaTrilhosDoCerrado.bat";
static Startup startup;
static Process process;

void entry(void) {
    DWord size = GetModuleFileNameW(0, directory, 32768);
    if (!size || size >= 32768) ExitProcess(1);
    while (size && directory[size - 1] != L'\\') size--;
    if (!size) ExitProcess(1);
    directory[size] = 0;
    if (!SetCurrentDirectoryW(directory)) ExitProcess(1);
    startup.size = sizeof(Startup);
    if (!CreateProcessW(0, command, 0, 0, 0, 0, 0, directory, &startup, &process)) ExitProcess(1);
    CloseHandle(process.thread);
    WaitForSingleObject(process.process, 0xffffffff);
    DWord code = 1;
    GetExitCodeProcess(process.process, &code);
    CloseHandle(process.process);
    ExitProcess(code);
}
