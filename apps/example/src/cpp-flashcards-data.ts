export interface Flashcard {
  id: number
  chapter: string      // e.g. '0', '1', '2' …
  topic: string        // fine-grained label shown on the card
  noteSection: string  // heading text in the chapter notes file to extract
  q: string
  a: string
}

export const CHAPTER_NAMES: Record<string, string> = {
  '0': 'Ch. 0 — Introduction',
}

export const CHAPTERS = Object.keys(CHAPTER_NAMES)

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
    id: 1, chapter: '0', topic: 'Machine Code', noteSection: 'Machine Language',
    q: 'What is machine language?',
    a: 'The only language a CPU can directly process — sequences of binary instructions (1s and 0s). Each instruction represents a single, primitive operation.',
  },
  {
    id: 2, chapter: '0', topic: 'Machine Code', noteSection: 'Machine Language',
    q: 'What is an instruction set (ISA)?',
    a: 'The complete set of all machine language instructions a particular CPU understands. Every CPU family (x86, ARM, RISC-V) has its own ISA.',
  },
  {
    id: 3, chapter: '0', topic: 'Machine Code', noteSection: 'Machine Language',
    q: 'What does a single machine instruction represent?',
    a: 'One very specific, primitive operation — e.g. "compare these two numbers" or "copy this value to that memory location." Example: 10110000 01100001.',
  },

  // ── Assembly ──────────────────────────────────────────────
  {
    id: 4, chapter: '0', topic: 'Assembly', noteSection: 'Assembly Language',
    q: 'What is assembly language?',
    a: 'A human-readable representation of machine language using mnemonics instead of raw binary. e.g. `mov al, 0x61` instead of `10110000 01100001`.',
  },
  {
    id: 5, chapter: '0', topic: 'Assembly', noteSection: 'Assembly Language',
    q: 'What is an assembler?',
    a: 'A program that translates assembly language into machine code.',
  },
  {
    id: 6, chapter: '0', topic: 'Assembly', noteSection: 'Assembly Language',
    q: 'How does assembly map to machine instructions?',
    a: 'Typically 1:1 — each assembly instruction corresponds to exactly one machine instruction.',
  },
  {
    id: 7, chapter: '0', topic: 'Assembly', noteSection: 'Assembly Language',
    q: 'Why are machine language and assembly called "low-level" languages?',
    a: 'They provide minimal abstraction from the hardware — you\'re working very close to what the CPU actually does, with no high-level constructs.',
  },

  // ── Low-Level ─────────────────────────────────────────────
  {
    id: 8, chapter: '0', topic: 'Low-Level', noteSection: 'Downsides of Low-Level Languages',
    q: 'What are the four main downsides of low-level languages?',
    a: '• Not portable — tied to a specific ISA\n• Requires deep hardware knowledge\n• Hard to read and reason about\n• Limited expressiveness — only primitive operations',
  },
  {
    id: 9, chapter: '0', topic: 'Low-Level', noteSection: 'Downsides of Low-Level Languages',
    q: 'Why is portability a problem with assembly?',
    a: 'Assembly targets a specific instruction set — code written for x86 won\'t run on ARM without being completely rewritten.',
  },
  {
    id: 10, chapter: '0', topic: 'Low-Level', noteSection: 'Downsides of Low-Level Languages',
    q: 'Why is assembly hard to reason about even if individual instructions are clear?',
    a: 'Even simple high-level operations require many instructions, making it hard to see the overall logic of any non-trivial program.',
  },

  // ── High-Level ────────────────────────────────────────────
  {
    id: 11, chapter: '0', topic: 'High-Level', noteSection: 'High-Level Languages',
    q: 'What are the two methods for translating high-level code into machine code?',
    a: '• Compilation — ahead-of-time, produces an executable\n• Interpretation — at runtime, executes source line by line',
  },
  {
    id: 12, chapter: '0', topic: 'High-Level', noteSection: 'High-Level Languages',
    q: 'What does a compiler do?',
    a: 'Reads source code and translates it entirely into machine code, producing an executable. The compiler itself is not needed to run the result.',
  },
  {
    id: 13, chapter: '0', topic: 'High-Level', noteSection: 'High-Level Languages',
    q: 'What is a cross-platform program?',
    a: 'A program written in a high-level language that can be compiled and run on multiple different platforms without modification.',
  },
  {
    id: 14, chapter: '0', topic: 'High-Level', noteSection: 'High-Level Languages',
    q: 'Why doesn\'t the end user need a compiler to run a C++ program?',
    a: 'The compiler translates source code into machine code ahead of time. The resulting executable contains CPU instructions that run directly.',
  },
  {
    id: 15, chapter: '0', topic: 'High-Level', noteSection: 'Compilation Pipeline',
    q: 'What are the two high-level stages of the compilation pipeline?',
    a: '• Source code → Compiler → Executable\n• Executable → Hardware → Program results',
  },

  // ── C/C++ History ─────────────────────────────────────────
  {
    id: 16, chapter: '0', topic: 'C/C++ History', noteSection: 'History: C and C++',
    q: 'When and where was C developed, and by whom?',
    a: '1972, Bell Labs, by Dennis Ritchie. Goals: minimal, easy to compile, efficient memory access, self-contained.',
  },
  {
    id: 17, chapter: '0', topic: 'C/C++ History', noteSection: 'History: C and C++',
    q: 'What was significant about rewriting Unix in C (1973)?',
    a: 'It proved C\'s portability — Unix could then run on many different CPU architectures, not just the one it was originally written for.',
  },
  {
    id: 18, chapter: '0', topic: 'C/C++ History', noteSection: 'History: C and C++',
    q: 'What were the major C standardisation milestones?',
    a: '• C89/ANSI C — 1989\n• C90 (ISO) — 1990\n• C99 — 1999',
  },
  {
    id: 19, chapter: '0', topic: 'C/C++ History', noteSection: 'History: C and C++',
    q: 'When was C++ developed, by whom, and what was its most notable addition over C?',
    a: 'Starting 1979, by Bjarne Stroustrup at Bell Labs. Most notable addition: object-oriented programming.',
  },
  {
    id: 20, chapter: '0', topic: 'C/C++ History', noteSection: 'History: C and C++',
    q: 'When was C++ first standardised, and what are the major versions?',
    a: '1998. Then C++03, C++11, C++14, C++17, C++20, C++23. C++11 is the widely accepted new baseline.',
  },
  {
    id: 21, chapter: '0', topic: 'C/C++ History', noteSection: 'History: C and C++',
    q: 'What is the underlying philosophy of C and C++?',
    a: '"Trust the programmer" — maximum freedom, but many pitfalls. Knowing what NOT to do is nearly as important as knowing what to do.',
  },

  // ── Dev Process ───────────────────────────────────────────
  {
    id: 22, chapter: '0', topic: 'Dev Process', noteSection: 'Development Process',
    q: 'What are the 7 steps of the C++ development process?',
    a: '1. Define problem\n2. Design solution\n3. Write program\n4. Compile\n5. Link object files\n6. Test\n7. Debug → loop back to step 4',
  },
  {
    id: 23, chapter: '0', topic: 'Dev Process', noteSection: 'Development Process',
    q: 'What percentage of programmer time is spent writing initial code vs maintenance?',
    a: 'Only 10–40% writing initial code. The remaining 60–90% is maintenance: debugging, adapting to environment changes, enhancements, improvements.',
  },

  // ── Compiler ──────────────────────────────────────────────
  {
    id: 24, chapter: '0', topic: 'Compiler', noteSection: 'The Compiler',
    q: 'What are the two main things a compiler does?',
    a: '• Checks code against C++ language rules — aborts on errors with line numbers\n• Translates C++ into machine language, stored in an object file',
  },
  {
    id: 25, chapter: '0', topic: 'Compiler', noteSection: 'The Compiler',
    q: 'What is an object file?',
    a: 'An intermediate file (.o or .obj) produced by the compiler, containing machine language and metadata needed by the linker and debugger.',
  },
  {
    id: 26, chapter: '0', topic: 'Compiler', noteSection: 'Compiler Internals',
    q: 'What are the four internal stages of a compiler?',
    a: 'Lexing → Parsing → Optimization → Code generation',
  },
  {
    id: 27, chapter: '0', topic: 'Compiler', noteSection: 'Compiler Internals',
    q: 'What does lexing do?',
    a: 'Splits source code into tokens. e.g. `int x = 5 + 3;` becomes `[int] [x] [=] [5] [+] [3] [;]`',
  },
  {
    id: 28, chapter: '0', topic: 'Compiler', noteSection: 'Compiler Internals',
    q: 'What does parsing produce?',
    a: 'An AST (Abstract Syntax Tree) representing the grammatical structure of the code. e.g. `x = 5 + 3` becomes a tree with = at root, x and + as children, 5 and 3 as leaves.',
  },
  {
    id: 29, chapter: '0', topic: 'Compiler', noteSection: 'Compiler Internals',
    q: 'What can happen during the optimization stage?',
    a: 'The compiler simplifies the AST — e.g. constant folding: `5 + 3` is replaced with `8` at compile time, so no addition happens at runtime.',
  },
  {
    id: 30, chapter: '0', topic: 'Compiler', noteSection: 'Compiler Internals',
    q: 'What happens during code generation?',
    a: 'Machine code is emitted from the optimized AST — e.g. the tree for `x = 8` becomes `mov eax, 8`.',
  },
  {
    id: 31, chapter: '0', topic: 'Compiler', noteSection: 'Why C++ Parsing is Hard',
    q: 'Why is C++ particularly hard to parse?',
    a: 'C++ grammar is context-sensitive — the parser must know what a symbol IS before it can determine structure. e.g. `a * b;` could be multiplication OR a pointer declaration depending on whether `a` is a type or a variable.',
  },
  {
    id: 32, chapter: '0', topic: 'Compiler', noteSection: 'Why C++ Parsing is Hard',
    q: 'Give an example of C++ template parsing ambiguity.',
    a: '`Foo<Bar<X>>` — is `>>` two consecutive template closing brackets, or the right-shift operator? The parser needs context to decide.',
  },
  {
    id: 33, chapter: '0', topic: 'Compiler', noteSection: 'Compilation of Multiple Source Files',
    q: 'When a project has multiple .cpp files, what does each compile to?',
    a: 'Each .cpp file is compiled independently into its own object file (.o or .obj). These are later combined by the linker.',
  },

  // ── Linker ────────────────────────────────────────────────
  {
    id: 34, chapter: '0', topic: 'Linker', noteSection: 'The Linker',
    q: 'What are the four tasks of the linker?',
    a: '• Reads and validates object files\n• Resolves cross-file dependencies (connects definitions to uses)\n• Links library files (Standard Library + third-party)\n• Outputs the final executable',
  },
  {
    id: 35, chapter: '0', topic: 'Linker', noteSection: 'The Linker',
    q: 'What is a linker error?',
    a: 'An error when the linker can\'t find a definition for something that was referenced — e.g. you called a function in one file that doesn\'t exist anywhere.',
  },
  {
    id: 36, chapter: '0', topic: 'Linker', noteSection: 'The Linker',
    q: 'What is the C++ Standard Library?',
    a: 'A collection of precompiled code included with C++ (e.g. iostream) that the linker automatically links into your executable.',
  },
  {
    id: 37, chapter: '0', topic: 'Linker', noteSection: 'The Linker',
    q: 'What is the difference between the Standard Library and third-party libraries?',
    a: '• Standard Library — ships with C++, linked by default\n• Third-party — external, specialized (audio, graphics, etc.), must be explicitly added',
  },
  {
    id: 38, chapter: '0', topic: 'Linker', noteSection: 'The Linker',
    q: 'What is "building" a program?',
    a: 'The entire process of converting source files into an executable — compilation + linking. The result is called a build.',
  },
  {
    id: 39, chapter: '0', topic: 'Linker', noteSection: 'The Linker',
    q: 'What are build automation tools and why are they needed?',
    a: 'Tools like `make` or `build2` that automate compile/link steps. Needed for complex projects with many files where manually running each step would be impractical.',
  },

  // ── Build Config ──────────────────────────────────────────
  {
    id: 40, chapter: '0', topic: 'Build Config', noteSection: 'Build Configurations',
    q: 'What is a build configuration (build target)?',
    a: 'A collection of settings determining how a project is built — executable name, include paths, debug info, optimisation level, etc.',
  },
  {
    id: 41, chapter: '0', topic: 'Build Config', noteSection: 'Build Configurations',
    q: 'What is the debug build configuration and when is it used?',
    a: 'No optimisations, includes debug symbols (`g++ -g`), source lines map to compiled output. Used during development so you can inspect state at breakpoints.',
  },
  {
    id: 42, chapter: '0', topic: 'Build Config', noteSection: 'Build Configurations',
    q: 'What is the release build configuration and when is it used?',
    a: 'Optimised, debug info stripped. Smaller and faster. Used for production distribution or performance testing.',
  },
  {
    id: 43, chapter: '0', topic: 'Build Config', noteSection: 'Build Configurations',
    q: 'Why might a debug build behave differently from a release build?',
    a: 'Optimisations can transform or reorder code. This is especially dangerous around undefined behaviour — in debug the UB may appear harmless; in release the compiler may exploit it in unexpected ways.',
  },
  {
    id: 44, chapter: '0', topic: 'Build Config', noteSection: 'Projects and Build Configurations',
    q: 'What is a project in C++ development?',
    a: 'A container holding all source files, assets, and settings needed to produce a single executable. One project = one program.',
  },
  {
    id: 45, chapter: '0', topic: 'Build Config', noteSection: 'Projects and Build Configurations',
    q: 'What is a workspace or solution?',
    a: 'A container for one or more related projects. e.g. a game engine might have separate projects for the core library, the editor, and each example game — all in one solution.',
  },

  // ── Settings ──────────────────────────────────────────────
  {
    id: 46, chapter: '0', topic: 'Settings', noteSection: 'Warning Levels',
    q: 'What is the recommended approach to compiler warnings?',
    a: 'Treat them as errors — don\'t let them pile up. Enable `-Wall -Wextra` and the `-Werror` flag (treat warnings as errors).',
  },
  {
    id: 47, chapter: '0', topic: 'Settings', noteSection: 'Standards Compliance',
    q: 'What does `-pedantic-errors` do, and what does it NOT catch?',
    a: 'Disables compiler-specific extensions, enforcing standard C++ syntax. Does NOT catch undefined behaviour, implementation-defined behaviour, compiler bugs, or order-of-evaluation issues.',
  },
  {
    id: 48, chapter: '0', topic: 'Settings', noteSection: 'Standards Compliance',
    q: 'What is undefined behaviour (UB)?',
    a: 'Code that the C++ standard gives no guaranteed runtime behaviour. It compiles fine but can do anything at runtime — crash, produce wrong results, or appear to work. Example: reading an uninitialised variable.',
  },
  {
    id: 49, chapter: '0', topic: 'Settings', noteSection: 'Standards Compliance',
    q: 'What is implementation-defined behaviour?',
    a: 'Behaviour the C++ standard leaves up to the compiler — e.g. `sizeof(int)` can be 2, 4, or 8 bytes depending on the platform and compiler.',
  },
  {
    id: 50, chapter: '0', topic: 'Settings', noteSection: 'Standards Compliance',
    q: 'What tool catches runtime undefined behaviour?',
    a: '`-fsanitize=undefined` — the UBSan (undefined behaviour sanitizer). It instruments the binary to detect UB at runtime.',
  },
  {
    id: 51, chapter: '0', topic: 'Settings', noteSection: 'Compiler Settings and Best Practices',
    q: 'What is the full layered toolkit for standards compliance?',
    a: '• `-pedantic-errors` — syntax extensions\n• `-Wall -Wextra` — common mistakes\n• `-fsanitize=undefined` — runtime UB\n• `clang-tidy` — static analysis\n• Test on multiple compilers — portability',
  },

  // ── Instructions ──────────────────────────────────────────
  {
    id: 52, chapter: '0', topic: 'Instructions', noteSection: 'Machine Language Instruction Set',
    q: 'What are the five categories of machine language instructions?',
    a: 'Data movement · Arithmetic · Bitwise logic · Comparison and control flow · System',
  },
  {
    id: 53, chapter: '0', topic: 'Instructions', noteSection: 'Machine Language Instruction Set',
    q: 'Name the data movement instructions and what each does.',
    a: '• MOV — copy between registers/memory\n• LOAD — memory → register\n• STORE — register → memory\n• PUSH — onto stack\n• POP — off stack',
  },
  {
    id: 54, chapter: '0', topic: 'Instructions', noteSection: 'Machine Language Instruction Set',
    q: 'Name the four arithmetic instructions.',
    a: 'ADD, SUB, MUL, DIV',
  },
  {
    id: 55, chapter: '0', topic: 'Instructions', noteSection: 'Machine Language Instruction Set',
    q: 'Name the bitwise logic instructions.',
    a: 'AND, OR, NOT, XOR, SHL/SHR (shift left/right)',
  },
  {
    id: 56, chapter: '0', topic: 'Instructions', noteSection: 'Machine Language Instruction Set',
    q: 'What do CMP, JMP, and JE/JNE/JG/JL do?',
    a: '• CMP — compares two values, sets CPU flags\n• JMP — unconditional jump to address\n• JE/JNE/JG/JL — conditional jumps based on those flags',
  },
  {
    id: 57, chapter: '0', topic: 'Instructions', noteSection: 'Machine Language Instruction Set',
    q: 'What do CALL and RET do?',
    a: '• CALL — jumps to a subroutine, saves return address on the stack\n• RET — pops the return address and jumps back to it',
  },
  {
    id: 58, chapter: '0', topic: 'Instructions', noteSection: 'Machine Language Instruction Set',
    q: 'What do NOP, HLT, and INT do?',
    a: '• NOP — no operation (burn a cycle, used for alignment/timing)\n• HLT — halt the CPU\n• INT — trigger a software interrupt (syscall)',
  },
  {
    id: 59, chapter: '0', topic: 'Instructions', noteSection: 'Machine Language Instruction Set',
    q: 'At the most fundamental hardware level, what does all computation reduce to?',
    a: 'AND, OR, NOT gates — all arithmetic and data movement can theoretically be built from NAND or NOR gates alone.',
  },

  // ── Asm Syntax ────────────────────────────────────────────
  {
    id: 60, chapter: '0', topic: 'Asm Syntax', noteSection: 'Assembly Syntax Across Architectures',
    q: 'What is the key difference between AT&T and Intel syntax in x86 assembly?',
    a: 'AT&T reverses the operand order: source first, then destination. Intel is destination first.\n\ne.g. AT&T: `movq %rbx, %rax` (rbx → rax). Intel: `mov rax, rbx` (same result, opposite order).',
  },
  {
    id: 61, chapter: '0', topic: 'Asm Syntax', noteSection: 'Which Architecture to Learn?',
    q: 'Which assembly architecture has the most regular instruction format, and why?',
    a: 'RISC-V — every instruction follows the same 3-operand pattern. No special cases.',
  },
  {
    id: 62, chapter: '0', topic: 'Asm Syntax', noteSection: 'Which Architecture to Learn?',
    q: 'Why is x86 the most irregular assembly architecture?',
    a: 'Its age — it has accumulated decades of special cases and backward-compatible quirks, making it far less consistent than modern architectures.',
  },
  {
    id: 63, chapter: '0', topic: 'Asm Syntax', noteSection: 'Which Architecture to Learn?',
    q: 'Which assembly architecture is best to learn first, and why?',
    a: 'RISC-V — regular, unambiguous, and all concepts (registers, memory, stack, calling conventions) transfer directly to other architectures.',
  },
  {
    id: 64, chapter: '0', topic: 'Asm Syntax', noteSection: 'RISC-V (RV64I)',
    q: 'In RISC-V, there\'s no PUSH instruction. How do you push a register onto the stack?',
    a: 'Manually:\n1. Decrement the stack pointer: `addi sp, sp, -8`\n2. Store the register: `sd a0, 0(sp)`',
  },
  {
    id: 65, chapter: '0', topic: 'Asm Syntax', noteSection: 'ARM (AArch32, UAL syntax)',
    q: 'In ARM, what instruction is used for a function call, and what makes it different from a plain branch?',
    a: '`BL func` (Branch with Link) — saves the return address in the Link Register (LR). A plain `B` branch does not save a return address.',
  },
  {
    id: 66, chapter: '0', topic: 'Asm Syntax', noteSection: 'x86-64 — AT&T syntax (used by GCC/GAS)',
    q: 'What suffix does GCC\'s AT&T syntax add to x86 instructions, and what does it indicate?',
    a: 'A size suffix: `q` (64-bit), `l` (32-bit), `w` (16-bit), `b` (8-bit). e.g. `movq` operates on 64-bit values. Intel syntax doesn\'t use these suffixes.',
  },
  {
    id: 67, chapter: '0', topic: 'Asm Syntax', noteSection: 'Assembly Syntax Across Architectures',
    q: 'What is the system call instruction in x86-64, ARM, and RISC-V?',
    a: '• x86-64: `syscall`\n• ARM (AArch32): `SVC #0`\n• RISC-V: `ecall`',
  },

  // ── First Program ─────────────────────────────────────────
  {
    id: 68, chapter: '0', topic: 'First Program', noteSection: 'First Program',
    q: 'What does `#include <iostream>` do?',
    a: 'It\'s a preprocessor directive — it copies the contents of the iostream header into the current translation unit before compilation begins.',
  },
  {
    id: 69, chapter: '0', topic: 'First Program', noteSection: 'First Program',
    q: 'What is the value of `int num;` (declared without initialisation)?',
    a: 'Undefined — it contains whatever bytes happen to be at that memory location. Reading it is undefined behaviour. The OS zeroes memory between processes, but not between allocations within the same process.',
  },
  {
    id: 70, chapter: '0', topic: 'First Program', noteSection: 'First Program',
    q: 'In `while (std::cin >> num)`, what stops the loop?',
    a: 'When `std::cin >> num` fails — typically on EOF (Ctrl+D on Linux, Ctrl+Z on Windows) or when input can\'t be parsed as the expected type. The stream enters a fail state and evaluates as false.',
  },
  {
    id: 71, chapter: '0', topic: 'First Program', noteSection: 'First Program',
    q: 'Why doesn\'t the OS guarantee zero memory within a running process?',
    a: 'Memory is reused across allocations without clearing. The OS only zeroes memory when transferring it between separate processes (for security).',
  },

  // ── Parsing ───────────────────────────────────────────────
  {
    id: 72, chapter: '0', topic: 'Parsing', noteSection: 'Grammar and Parsing',
    q: 'What is a grammar in the context of programming languages?',
    a: 'The set of rules defining valid syntax — what sequences of tokens constitute a valid program. e.g. `int x = 5;` is valid; `int = x 5;` is not.',
  },
  {
    id: 73, chapter: '0', topic: 'Parsing', noteSection: 'Grammar and Parsing',
    q: 'What is parsing, and what does it produce?',
    a: 'Reading source text, checking it conforms to the grammar, and building an AST (Abstract Syntax Tree). Parsing is a separate step from code generation — it understands structure, not meaning.',
  },
  {
    id: 74, chapter: '0', topic: 'Parsing', noteSection: 'Grammar and Parsing',
    q: 'What is the difference between parsing and code generation?',
    a: 'Parsing checks structure and builds a tree. Code generation translates that tree into machine instructions. They are separate stages — parsing always comes first.',
  },
]
