export interface Flashcard {
  id: number
  topic: string
  q: string
  a: string
}

export const TOPICS = [
  'Machine Code',
  'Assembly',
  'Low-Level',
  'High-Level',
  'C/C++ History',
  'Dev Process',
  'Compiler',
  'Linker',
  'Build Config',
  'Settings',
  'Instructions',
  'Asm Syntax',
  'First Program',
  'Parsing',
] as const

export const FLASHCARDS: Flashcard[] = [
  // ── Machine Code ──────────────────────────────────────────
  {
    id: 1,
    topic: 'Machine Code',
    q: 'What is machine language?',
    a: 'The only language a CPU can directly process — sequences of binary instructions (1s and 0s). Each instruction represents a single, primitive operation.',
  },
  {
    id: 2,
    topic: 'Machine Code',
    q: 'What is an instruction set (ISA)?',
    a: 'The complete set of all machine language instructions a particular CPU understands. Every CPU family (x86, ARM, RISC-V) has its own ISA.',
  },
  {
    id: 3,
    topic: 'Machine Code',
    q: 'What does a single machine instruction represent?',
    a: 'One very specific, primitive operation — e.g. "compare these two numbers" or "copy this value to that memory location." Example: 10110000 01100001.',
  },

  // ── Assembly ──────────────────────────────────────────────
  {
    id: 4,
    topic: 'Assembly',
    q: 'What is assembly language?',
    a: 'A human-readable representation of machine language using mnemonics instead of raw binary. e.g. `mov al, 0x61` instead of `10110000 01100001`.',
  },
  {
    id: 5,
    topic: 'Assembly',
    q: 'What is an assembler?',
    a: 'A program that translates assembly language into machine code.',
  },
  {
    id: 6,
    topic: 'Assembly',
    q: 'How does assembly map to machine instructions?',
    a: 'Typically 1:1 — each assembly instruction corresponds to exactly one machine instruction.',
  },
  {
    id: 7,
    topic: 'Assembly',
    q: 'Why are machine language and assembly called "low-level" languages?',
    a: 'They provide minimal abstraction from the hardware — you\'re working very close to what the CPU actually does, with no high-level constructs.',
  },

  // ── Low-Level ─────────────────────────────────────────────
  {
    id: 8,
    topic: 'Low-Level',
    q: 'What are the four main downsides of low-level languages?',
    a: '(1) Not portable — tied to a specific ISA. (2) Requires deep hardware knowledge. (3) Hard to read and reason about. (4) Limited expressiveness — only primitive operations.',
  },
  {
    id: 9,
    topic: 'Low-Level',
    q: 'Why is portability a problem with assembly?',
    a: 'Assembly targets a specific instruction set — code written for x86 won\'t run on ARM without being completely rewritten.',
  },
  {
    id: 10,
    topic: 'Low-Level',
    q: 'Why is assembly hard to reason about even if individual instructions are clear?',
    a: 'Even simple high-level operations require many instructions, making it hard to see the overall logic of any non-trivial program.',
  },

  // ── High-Level ────────────────────────────────────────────
  {
    id: 11,
    topic: 'High-Level',
    q: 'What are the two methods for translating high-level code into machine code?',
    a: 'Compilation (ahead-of-time, produces an executable) and interpretation (at runtime, executes source line by line).',
  },
  {
    id: 12,
    topic: 'High-Level',
    q: 'What does a compiler do?',
    a: 'Reads source code and translates it entirely into machine code, producing an executable. The compiler itself is not needed to run the result.',
  },
  {
    id: 13,
    topic: 'High-Level',
    q: 'What is a cross-platform program?',
    a: 'A program written in a high-level language that can be compiled and run on multiple different platforms without modification.',
  },
  {
    id: 14,
    topic: 'High-Level',
    q: 'Why doesn\'t the end user need a compiler to run a C++ program?',
    a: 'The compiler translates source code into machine code ahead of time. The resulting executable contains CPU instructions that run directly.',
  },
  {
    id: 15,
    topic: 'High-Level',
    q: 'What are the two high-level stages of the compilation pipeline?',
    a: '(1) Source code → Compiler → Executable. (2) Executable → Hardware → Program results.',
  },

  // ── C/C++ History ─────────────────────────────────────────
  {
    id: 16,
    topic: 'C/C++ History',
    q: 'When and where was C developed, and by whom?',
    a: '1972, Bell Labs, by Dennis Ritchie. Goals: minimal, easy to compile, efficient memory access, self-contained.',
  },
  {
    id: 17,
    topic: 'C/C++ History',
    q: 'What was significant about rewriting Unix in C (1973)?',
    a: 'It proved C\'s portability — Unix could then run on many different CPU architectures, not just the one it was originally written for.',
  },
  {
    id: 18,
    topic: 'C/C++ History',
    q: 'What were the major C standardisation milestones?',
    a: 'C89/ANSI C in 1989. Adopted as C90 by ISO in 1990. Updated to C99 in 1999.',
  },
  {
    id: 19,
    topic: 'C/C++ History',
    q: 'When was C++ developed, by whom, and what was its most notable addition over C?',
    a: 'Starting 1979, by Bjarne Stroustrup at Bell Labs. Most notable addition: object-oriented programming.',
  },
  {
    id: 20,
    topic: 'C/C++ History',
    q: 'When was C++ first standardised, and what are the major versions?',
    a: '1998. Then C++03, C++11, C++14, C++17, C++20, C++23. C++11 is the widely accepted new baseline.',
  },
  {
    id: 21,
    topic: 'C/C++ History',
    q: 'What is the underlying philosophy of C and C++?',
    a: '"Trust the programmer" — maximum freedom, but many pitfalls. Knowing what NOT to do is nearly as important as knowing what to do.',
  },

  // ── Dev Process ───────────────────────────────────────────
  {
    id: 22,
    topic: 'Dev Process',
    q: 'What are the 7 steps of the C++ development process?',
    a: '(1) Define problem. (2) Design solution. (3) Write program. (4) Compile. (5) Link object files. (6) Test. (7) Debug — then loop back to step 4.',
  },
  {
    id: 23,
    topic: 'Dev Process',
    q: 'What percentage of programmer time is spent writing initial code vs maintenance?',
    a: 'Only 10–40% writing initial code. The remaining 60–90% is maintenance: debugging, adapting to environment changes, enhancements, improvements.',
  },

  // ── Compiler ──────────────────────────────────────────────
  {
    id: 24,
    topic: 'Compiler',
    q: 'What are the two main things a compiler does?',
    a: '(1) Checks code against C++ language rules — aborts on errors with line numbers. (2) Translates C++ into machine language, stored in an object file.',
  },
  {
    id: 25,
    topic: 'Compiler',
    q: 'What is an object file?',
    a: 'An intermediate file (.o or .obj) produced by the compiler, containing machine language and metadata needed by the linker and debugger.',
  },
  {
    id: 26,
    topic: 'Compiler',
    q: 'What are the four internal stages of a compiler?',
    a: 'Lexing → Parsing → Optimization → Code generation.',
  },
  {
    id: 27,
    topic: 'Compiler',
    q: 'What does lexing do?',
    a: 'Splits source code into tokens. e.g. `int x = 5 + 3;` becomes `[int] [x] [=] [5] [+] [3] [;]`.',
  },
  {
    id: 28,
    topic: 'Compiler',
    q: 'What does parsing produce?',
    a: 'An AST (Abstract Syntax Tree) representing the grammatical structure of the code. e.g. `x = 5 + 3` becomes a tree with = at root, x and + as children, 5 and 3 as leaves.',
  },
  {
    id: 29,
    topic: 'Compiler',
    q: 'What can happen during the optimization stage?',
    a: 'The compiler simplifies or improves the tree — e.g. constant folding: `5 + 3` is replaced with `8` at compile time, so no addition happens at runtime.',
  },
  {
    id: 30,
    topic: 'Compiler',
    q: 'What happens during code generation?',
    a: 'Machine code is emitted from the optimized AST — e.g. the tree for `x = 8` becomes `mov eax, 8`.',
  },
  {
    id: 31,
    topic: 'Compiler',
    q: 'Why is C++ particularly hard to parse?',
    a: 'C++ grammar is context-sensitive — the parser must know what a symbol IS before it can determine structure. e.g. `a * b;` could be multiplication OR a pointer declaration depending on whether `a` is a type or a variable.',
  },
  {
    id: 32,
    topic: 'Compiler',
    q: 'Give a second example of C++ parsing ambiguity.',
    a: '`Foo<Bar<X>>` — is `>>` two consecutive template closing brackets, or the right-shift operator? The parser needs context to decide.',
  },
  {
    id: 33,
    topic: 'Compiler',
    q: 'When a project has multiple .cpp files, what does each compile to?',
    a: 'Each .cpp file is compiled independently into its own object file (.o or .obj). These are later combined by the linker.',
  },

  // ── Linker ────────────────────────────────────────────────
  {
    id: 34,
    topic: 'Linker',
    q: 'What are the four tasks of the linker?',
    a: '(1) Reads and validates object files. (2) Resolves cross-file dependencies. (3) Links library files (Standard Library + third-party). (4) Outputs the final executable.',
  },
  {
    id: 35,
    topic: 'Linker',
    q: 'What is a linker error?',
    a: 'An error when the linker can\'t find a definition for something that was referenced — e.g. you called a function in one file that doesn\'t exist anywhere.',
  },
  {
    id: 36,
    topic: 'Linker',
    q: 'What is the C++ Standard Library?',
    a: 'A collection of precompiled code included with C++ (e.g. iostream) that the linker automatically links into your executable.',
  },
  {
    id: 37,
    topic: 'Linker',
    q: 'What is the difference between the Standard Library and third-party libraries?',
    a: 'The Standard Library ships with C++ and is linked by default. Third-party libraries are external, specialized (audio, graphics, etc.) and must be explicitly added.',
  },
  {
    id: 38,
    topic: 'Linker',
    q: 'What is "building" a program?',
    a: 'The entire process of converting source files into an executable — compilation + linking. The result is called a build.',
  },
  {
    id: 39,
    topic: 'Linker',
    q: 'What are build automation tools and why are they needed?',
    a: 'Tools like `make` or `build2` that automate compile/link steps. Needed for complex projects with many files where manually running each step would be impractical.',
  },

  // ── Build Config ──────────────────────────────────────────
  {
    id: 40,
    topic: 'Build Config',
    q: 'What is a build configuration (build target)?',
    a: 'A collection of settings determining how a project is built — executable name, include paths, debug info, optimisation level, etc.',
  },
  {
    id: 41,
    topic: 'Build Config',
    q: 'What is the debug build configuration and when is it used?',
    a: 'No optimisations, includes debug symbols (`g++ -g`), source lines map to compiled output. Used during development so you can inspect state at breakpoints.',
  },
  {
    id: 42,
    topic: 'Build Config',
    q: 'What is the release build configuration and when is it used?',
    a: 'Optimised, debug info stripped. Smaller and faster. Used for production distribution or performance testing.',
  },
  {
    id: 43,
    topic: 'Build Config',
    q: 'Why might a debug build behave differently from a release build?',
    a: 'Optimisations can transform or reorder code. This is especially dangerous around undefined behaviour — in debug the UB may appear harmless; in release the compiler may exploit it in unexpected ways.',
  },
  {
    id: 44,
    topic: 'Build Config',
    q: 'What is a project in C++ development?',
    a: 'A container holding all source files, assets, and settings needed to produce a single executable. One project = one program.',
  },
  {
    id: 45,
    topic: 'Build Config',
    q: 'What is a workspace or solution?',
    a: 'A container for one or more related projects. e.g. a game engine might have separate projects for the core library, the editor, and each example game — all in one solution.',
  },

  // ── Settings ──────────────────────────────────────────────
  {
    id: 46,
    topic: 'Settings',
    q: 'What is the recommended approach to compiler warnings?',
    a: 'Treat them as errors — don\'t let them pile up. Enable `-Wall -Wextra` and the `-Werror` flag (treat warnings as errors).',
  },
  {
    id: 47,
    topic: 'Settings',
    q: 'What does `-pedantic-errors` do, and what does it NOT catch?',
    a: 'Disables compiler-specific extensions, enforcing standard C++ syntax. Does NOT catch undefined behaviour, implementation-defined behaviour, compiler bugs, or order-of-evaluation issues.',
  },
  {
    id: 48,
    topic: 'Settings',
    q: 'What is undefined behaviour (UB)?',
    a: 'Code that the C++ standard gives no guaranteed runtime behaviour. It compiles fine but can do anything at runtime — crash, produce wrong results, or appear to work. Example: reading an uninitialised variable.',
  },
  {
    id: 49,
    topic: 'Settings',
    q: 'What is implementation-defined behaviour?',
    a: 'Behaviour the C++ standard leaves up to the compiler — e.g. `sizeof(int)` can be 2, 4, or 8 bytes depending on the platform and compiler.',
  },
  {
    id: 50,
    topic: 'Settings',
    q: 'What tool catches runtime undefined behaviour?',
    a: '`-fsanitize=undefined` — the UBSan (undefined behaviour sanitizer). It instruments the binary to detect UB at runtime.',
  },
  {
    id: 51,
    topic: 'Settings',
    q: 'What is the full layered toolkit for standards compliance?',
    a: '`-pedantic-errors` (syntax extensions) → `-Wall -Wextra` (common mistakes) → `-fsanitize=undefined` (runtime UB) → `clang-tidy` (static analysis) → test on multiple compilers (portability).',
  },

  // ── Instructions ──────────────────────────────────────────
  {
    id: 52,
    topic: 'Instructions',
    q: 'What are the five categories of machine language instructions?',
    a: 'Data movement, Arithmetic, Bitwise logic, Comparison and control flow, System.',
  },
  {
    id: 53,
    topic: 'Instructions',
    q: 'Name the data movement instructions and what each does.',
    a: 'MOV (copy between registers/memory), LOAD (memory → register), STORE (register → memory), PUSH (onto stack), POP (off stack).',
  },
  {
    id: 54,
    topic: 'Instructions',
    q: 'Name the four arithmetic instructions.',
    a: 'ADD, SUB, MUL, DIV.',
  },
  {
    id: 55,
    topic: 'Instructions',
    q: 'Name the bitwise logic instructions.',
    a: 'AND, OR, NOT, XOR, SHL/SHR (shift left/right).',
  },
  {
    id: 56,
    topic: 'Instructions',
    q: 'What do CMP, JMP, and JE/JNE/JG/JL do?',
    a: 'CMP compares two values and sets CPU flags. JMP unconditionally jumps to an address. JE/JNE/JG/JL are conditional jumps that test those flags.',
  },
  {
    id: 57,
    topic: 'Instructions',
    q: 'What do CALL and RET do?',
    a: 'CALL jumps to a subroutine and saves the return address (on the stack). RET pops the return address and jumps back to it.',
  },
  {
    id: 58,
    topic: 'Instructions',
    q: 'What do NOP, HLT, and INT do?',
    a: 'NOP — no operation (burn a cycle, used for alignment/timing). HLT — halt the CPU. INT — trigger a software interrupt (syscall).',
  },
  {
    id: 59,
    topic: 'Instructions',
    q: 'At the most fundamental hardware level, what does all computation reduce to?',
    a: 'AND, OR, NOT gates — all arithmetic and data movement can theoretically be built from NAND or NOR gates alone.',
  },

  // ── Asm Syntax ────────────────────────────────────────────
  {
    id: 60,
    topic: 'Asm Syntax',
    q: 'What is the key difference between AT&T and Intel syntax in x86 assembly?',
    a: 'AT&T reverses the operand order: source comes first, then destination. Intel is destination first. e.g. AT&T: `movq %rbx, %rax` (rbx → rax). Intel: `mov rax, rbx` (same result, opposite order on the page).',
  },
  {
    id: 61,
    topic: 'Asm Syntax',
    q: 'Which assembly architecture has the most regular instruction format, and why?',
    a: 'RISC-V — every instruction follows the same 3-operand pattern. No special cases.',
  },
  {
    id: 62,
    topic: 'Asm Syntax',
    q: 'Why is x86 the most irregular assembly architecture?',
    a: 'Its age — it has accumulated decades of special cases and backward-compatible quirks, making it far less consistent than modern architectures.',
  },
  {
    id: 63,
    topic: 'Asm Syntax',
    q: 'Which assembly architecture is best to learn first, and why?',
    a: 'RISC-V — regular, unambiguous, and all concepts (registers, memory, stack, calling conventions) transfer directly to other architectures.',
  },
  {
    id: 64,
    topic: 'Asm Syntax',
    q: 'In RISC-V, there\'s no PUSH instruction. How do you push a register onto the stack?',
    a: 'Manually: decrement the stack pointer (`addi sp, sp, -8`) then store the register (`sd a0, 0(sp)`).',
  },
  {
    id: 65,
    topic: 'Asm Syntax',
    q: 'In ARM, what instruction is used for a function call, and what makes it different from a plain branch?',
    a: '`BL func` (Branch with Link) — it saves the return address in the Link Register (LR). A plain `B` branch does not save a return address.',
  },
  {
    id: 66,
    topic: 'Asm Syntax',
    q: 'What suffix does GCC\'s AT&T syntax add to x86 instructions, and what does it indicate?',
    a: 'A size suffix: `q` (64-bit), `l` (32-bit), `w` (16-bit), `b` (8-bit). e.g. `movq` operates on 64-bit values. Intel syntax doesn\'t use these suffixes.',
  },
  {
    id: 67,
    topic: 'Asm Syntax',
    q: 'What is the x86-64 system call instruction, and what is the ARM equivalent?',
    a: 'x86-64: `syscall`. ARM (AArch32): `SVC #0` (Supervisor Call). RISC-V: `ecall`.',
  },

  // ── First Program ─────────────────────────────────────────
  {
    id: 68,
    topic: 'First Program',
    q: 'What does `#include <iostream>` do?',
    a: 'It\'s a preprocessor directive — it copies the contents of the iostream header into the current translation unit before compilation begins.',
  },
  {
    id: 69,
    topic: 'First Program',
    q: 'What is the value of `int num;` (declared without initialisation)?',
    a: 'Undefined — it contains whatever bytes happen to be at that memory location. Reading it is undefined behaviour. The OS zeroes memory between processes, but not between allocations within the same process.',
  },
  {
    id: 70,
    topic: 'First Program',
    q: 'In the loop `while (std::cin >> num)`, what stops it?',
    a: 'When `std::cin >> num` fails — typically on EOF (Ctrl+D on Linux, Ctrl+Z on Windows) or when the input can\'t be parsed as the expected type. The stream enters a fail state and evaluates as false.',
  },
  {
    id: 71,
    topic: 'First Program',
    q: 'Why doesn\'t the OS guarantee zero memory within a running process?',
    a: 'Memory is reused across allocations without clearing. Only when memory is transferred between separate processes does the OS zero it — otherwise freed/reused memory contains whatever was there before.',
  },

  // ── Parsing ───────────────────────────────────────────────
  {
    id: 72,
    topic: 'Parsing',
    q: 'What is a grammar in the context of programming languages?',
    a: 'The set of rules defining valid syntax — what sequences of tokens constitute a valid program. e.g. `int x = 5;` is valid; `int = x 5;` is not.',
  },
  {
    id: 73,
    topic: 'Parsing',
    q: 'What is parsing, and what does it produce?',
    a: 'Reading source text, checking it conforms to the grammar, and building an AST (Abstract Syntax Tree). Parsing is a separate step from code generation — it understands structure, not meaning.',
  },
  {
    id: 74,
    topic: 'Parsing',
    q: 'What is the difference between parsing and code generation?',
    a: 'Parsing checks structure and builds a tree. Code generation translates that tree into machine instructions. They are separate stages — parsing always comes first.',
  },
]
