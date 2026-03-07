# C++ Notes

## 1. Programming Languages Overview

### Machine Language

- A CPU can only process instructions written in **machine language** (or **machine code**).
- The set of all machine language instructions a given CPU understands is called its **instruction set**.
- Example instruction: `10110000 01100001`
- Each instruction is a command for a very specific job: "compare these two numbers", "copy this number into that memory location", etc.

### Assembly Language

- **Assembly language** is a more human-readable form of machine language. The same instruction above in x86 assembly: `mov al, 0x61`.
- Assembly programs must be translated into machine code by an **assembler** before execution. Each assembly instruction typically maps 1:1 to a machine instruction.
- Machine language and assembly are **low-level languages** — they provide minimal abstraction from the hardware.

### Downsides of Low-Level Languages

- **Not portable** — tied to a specific instruction set architecture; porting is non-trivial.
- **Requires deep hardware knowledge** — e.g. knowing which registers exist on a specific platform.
- **Hard to read** — individual instructions may be understandable but sections are hard to reason about, and even simple tasks require many instructions.
- **Limited expressiveness** — only primitive operations; the programmer must implement everything themselves.

### High-Level Languages

- High-level languages (C, C++, Pascal, Java, etc.) address the above downsides.
- Like assembly, high-level code must be translated to machine code before running. This is done by **compiling** or **interpreting**.
- C++ programs are usually **compiled**. A **compiler** translates C++ source code into machine code (or sometimes assembly).
- The machine code is packaged into an **executable** that can be distributed and run without the compiler installed.
- High-level languages are **portable**: a C++ program can often compile on any platform with a C++ compiler. Such programs are called **cross-platform**.

### Compilation Pipeline

```
  ┌──────────────────┐           ┌──────────┐           ┌────────────┐
  │  High-level      │           │          │           │            │
  │  language        │─Compiled─▶│ Compiler │─Produces─▶│ Executable │
  │  source code     │    by     │          │           │            │
  └──────────────────┘           └──────────┘           └────────────┘

  ┌────────────┐                 ┌──────────┐           ┌────────────────┐
  │            │                 │          │           │                │
  │ Executable │────Run on──────▶│ Hardware │─Produces─▶│ Program results│
  │            │                 │          │           │                │
  └────────────┘                 └──────────┘           └────────────────┘
```

## 2. History: C and C++

- **C** was developed in 1972 by Dennis Ritchie at Bell Labs — primarily a systems programming language. Goals: minimal, easy to compile, efficient memory access, self-contained.
- In 1973, Ritchie and Ken Thompson rewrote most of Unix in C, replacing assembly. C's portability allowed Unix to run on many different CPU architectures.
- C was standardised as **C89/ANSI C** in 1989, adopted as **C90** by ISO in 1990. Updated to **C99** in 1999.
- **C++** was developed by Bjarne Stroustrup at Bell Labs starting in 1979, as an extension of C. Its most notable addition: **object-oriented programming**.
- C++ was first standardised by ISO in **1998**. Major updates: **C++03, C++11, C++14, C++17, C++20, C++23**. C++11 is widely considered the new baseline.
- The underlying philosophy of C and C++: **"trust the programmer"** — which also means there are many pitfalls. Knowing what _not_ to do is nearly as important as knowing what to do.

## 3. Development Process

```
  ┌─────────────────────────────────────────┐
  │  Step 1: Define the problem to solve    │
  └────────────────────┬────────────────────┘
                       │
                       ▼
  ┌─────────────────────────────────────────┐
  │  Step 2: Design a solution              │
  └────────────────────┬────────────────────┘
                       │
                       ▼
  ┌─────────────────────────────────────────┐
  │  Step 3: Write a program that           │
  │          implements the solution        │
  └────────────────────┬────────────────────┘
                       │
                       ▼
  ┌─────────────────────────────────────────┐    ┌───────────┐
  │  Step 4: Compile the program            │◀───│  Step 7   │
  └────────────────────┬────────────────────┘    │   Debug   │
                       │                         └─────▲─────┘
                       ▼                               │
  ┌─────────────────────────────────────────┐          │
  │  Step 5: Link object files              │          │
  └────────────────────┬────────────────────┘          │
                       │                               │
                       ▼                               │
  ┌─────────────────────────────────────────┐          │
  │  Step 6: Test program                   │──────────┘
  └─────────────────────────────────────────┘
```

> Studies show only 10–40% of programmer time is spent writing initial code. The remaining 60–90% is **maintenance**: debugging, adapting to environment changes, enhancements, and internal improvements.
## 4. The Compiler

### What the Compiler Does

1. **Checks your code** against C++ language rules. Errors include line numbers to help pinpoint issues; compilation aborts until they are fixed.
2. **Translates C++ into machine language**, stored in an intermediate **object file** (`.o` or `.obj`). The object file also contains metadata needed by the linker and debugger.

### Compiler Internals

```
Source code   "int x = 5 + 3;"
     |
     ▼
1. LEXING      [int] [x] [=] [5] [+] [3] [;]   (split into tokens)
     |
     ▼
2. PARSING     Build a tree:                     (understand structure)
                   =
                  / \
                 x   +
                    / \
                   5   3
     |
     ▼
3. OPTIMIZATION  Maybe simplify: x = 8          (improve the tree)
     |
     ▼
4. CODE GENERATION  mov eax, 8                  (finally: machine code)
```
### Why C++ Parsing is Hard

```cpp
// Is this multiplication or a pointer declaration?
a * b;

// Is Foo<Bar<X>> two template closes or a >> operator?
Foo<Bar<X>>
```

C++ grammar is **context-sensitive** — the parser needs to know what `a` is (a type or a variable?) before it can correctly parse the line. This makes it slow. Compare to Go, which is always unambiguous.

### Compilation of Multiple Source Files

```
  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
  │  Source file:   │   │  Source file:   │   │  Source file:   │
  │ Calculator.cpp  │   │  Fraction.cpp   │   │    Math.cpp     │
  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
           │                     │                     │
        Compile               Compile               Compile
           │                     │                     │
           ▼                     ▼                     ▼
  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
  │  Object file:   │   │  Object file:   │   │  Object file:   │
  │  Calculator.o   │   │   Fraction.o    │   │     Math.o      │
  └─────────────────┘   └─────────────────┘   └─────────────────┘
```

## 5. The Linker

After compilation succeeds, the **linker** combines all object files into the final output (typically an executable).

The linker:

1. Reads and validates each object file.
2. Resolves cross-file dependencies — if you define something in one `.cpp` and use it in another, the linker connects them. Unresolved references produce a **linker error**.
3. Links in **library files** — collections of precompiled code for reuse (e.g. the C++ Standard Library).
4. Outputs the final executable (or library).

You can also optionally link **third-party libraries** for functionality not in the standard library (audio, graphics, networking, etc.).

```
  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
  │ Object file:  │  │ Object file:  │  │ Object file:  │
  │ Calculator.o  │  │  Fraction.o   │  │    Math.o     │
  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
          │                  │                  │
          └──────────┬───────┘──────────────────┘
                     │
  ┌──────────────┐   ▼                   ┌───────────────────┐
  │ C++ Standard │──▶ ┌────────────┐ ◀───│  Other Libraries  │
  │   Library    │   │   Linker   │     └───────────────────┘
  └──────────────┘   └─────┬──────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │  Executable file:   │
                  │   Calculator.exe    │
                  └─────────────────────┘
```

The full process of converting source files to an executable is called **building**. The result is called a **build**. For complex projects, build automation tools like **make** or **build2** are commonly used.

## 6. Projects and Build Configurations

- A **project** is a container holding all source files, images, data files, and settings needed to produce an executable. One project = one program.
- Projects are typically created inside a **workspace** or **solution** — a container for one or more related projects.
- Best practice: create a new project for each new program, and a new workspace/solution for each program while learning.

### Build Configurations

A **build configuration** (or **build target**) is a collection of project settings determining how your IDE builds the project: executable name, include paths, debug info, optimisation level, etc.

Common configurations:

- **Debug** — no optimisations, includes debug symbols (`g++ -g`), lines of source code map to compiled output. Used during development.
- **Release** — optimised, strips debug info. Used for production.

> Note: a program compiled in debug mode may behave differently to one compiled with optimisations, particularly around undefined behaviour.
## 7. Compiler Settings and Best Practices

### Warning Levels

- Don't let warnings pile up. Treat them as errors — a serious issue can get lost among trivial ones.
- Enable **"Treat warnings as errors"** to force resolution of all warnings.
- Enable `-Wall -Wextra` for broader diagnostic coverage, especially while learning.

### Standards Compliance

Disabling compiler extensions (`-pedantic-errors`) helps but does **not** guarantee standard compliance. It misses:

- **Undefined Behaviour (UB)** — compiles fine but has no guaranteed runtime behaviour (e.g. reading an uninitialised variable)
- **Implementation-defined behaviour** — things the standard leaves to the compiler (e.g. `sizeof(int)`)
- Compiler bugs and order-of-evaluation edge cases

Recommended layered approach:

|Tool|Catches|
|---|---|
|`-pedantic-errors`|Syntax extensions|
|`-Wall -Wextra`|Common mistakes, some UB|
|`-fsanitize=undefined`|Runtime UB|
|`clang-tidy`|Deeper static analysis|
|Test on multiple compilers|Portability issues|

Best practice: compile with both GCC and Clang using strict flags, and run sanitizers.
## 8. Machine Language Instruction Set

All computation reduces to a small set of primitive instructions. The categories are:

**Data movement**

- `MOV` — copy data between registers or memory
- `LOAD` — read data from memory into a register
- `STORE` — write data from a register to memory
- `PUSH` — push value onto the stack
- `POP` — pop value off the stack

**Arithmetic**

- `ADD` — add two values
- `SUB` — subtract
- `MUL` — multiply
- `DIV` — divide

**Bitwise logic**

- `AND` — bitwise AND
- `OR` — bitwise OR
- `NOT` — bitwise NOT (invert bits)
- `XOR` — bitwise exclusive OR
- `SHL/SHR` — shift bits left or right

**Comparison and control flow**

- `CMP` — compare two values (sets CPU flags)
- `JMP` — unconditional jump to address
- `JE/JNE/JG/JL` — conditional jumps based on flags
- `CALL` — jump to subroutine, saving return address
- `RET` — return from subroutine

**System**

- `NOP` — no operation
- `HLT` — halt the CPU
- `INT` — trigger a software interrupt (syscall)

> At the hardware level, everything reduces further to AND/OR/NOT — all arithmetic and data movement can theoretically be built from NAND or NOR gates alone.

### Assembly Syntax Across Architectures

The same logical operations have different syntax depending on the architecture. Key differences:

- **RISC-V** is the most regular — every instruction follows the same 3-operand pattern.
- **ARM** is similar to RISC-V but with more special cases.
- **x86** is the most irregular due to its age.
- **AT&T syntax** (used by GCC) reverses source and destination vs. Intel syntax — a common source of confusion.

#### x86-64 — Intel syntax

```asm
mov  rax, rbx          ; copy rbx into rax
mov  rax, [0x1000]     ; load from memory
mov  [0x1000], rax     ; store to memory
add  rax, rbx          ; rax = rax + rbx
sub  rax, rbx
imul rbx               ; rdx:rax = rax * rbx
idiv rbx               ; rax = rdx:rax / rbx
and  rax, rbx
or   rax, rbx
not  rax
xor  rax, rbx
shl  rax, 2
shr  rax, 2
cmp  rax, rbx
jmp  label
je   label
jne  label
jg   label
jl   label
call func
ret
push rax
pop  rax
nop
hlt
syscall
```

#### x86-64 — AT&T syntax (used by GCC/GAS)

```asm
movq  %rbx, %rax       ; note: src, dst — reversed vs Intel
movq  0x1000, %rax
movq  %rax, 0x1000
addq  %rbx, %rax
subq  %rbx, %rax
imulq %rbx
idivq %rbx
andq  %rbx, %rax
orq   %rbx, %rax
notq  %rax
xorq  %rbx, %rax
shlq  $2, %rax
shrq  $2, %rax
cmpq  %rbx, %rax
jmp   label
je    label
call  func
ret
pushq %rax
popq  %rax
syscall
```

#### ARM (AArch32, UAL syntax)

```asm
MOV  R0, R1            ; copy R1 into R0
LDR  R0, [R1]          ; load from address in R1
STR  R0, [R1]          ; store to address in R1
ADD  R0, R1, R2        ; R0 = R1 + R2
SUB  R0, R1, R2
MUL  R0, R1, R2
UDIV R0, R1, R2        ; ARMv7+ only
AND  R0, R1, R2
ORR  R0, R1, R2
MVN  R0, R1            ; NOT
EOR  R0, R1, R2        ; XOR
LSL  R0, R1, #2
LSR  R0, R1, #2
CMP  R1, R2
B    label
BEQ  label
BNE  label
BGT  label
BLT  label
BL   func              ; call (branch with link)
BX   LR                ; return
PUSH {R0}
POP  {R0}
NOP
WFI                    ; wait for interrupt (no HLT)
SVC  #0                ; syscall
```

#### RISC-V (RV64I)

```asm
mv   a0, a1            ; copy a1 into a0
lw   a0, 0(a1)         ; load word from address a1+0
sw   a0, 0(a1)         ; store word to address a1+0
add  a0, a1, a2        ; a0 = a1 + a2
sub  a0, a1, a2
mul  a0, a1, a2        ; M extension
div  a0, a1, a2        ; M extension
and  a0, a1, a2
or   a0, a1, a2
not  a0, a1            ; pseudo: xori a0, a1, -1
xor  a0, a1, a2
sll  a0, a1, a2        ; shift left logical
srl  a0, a1, a2        ; shift right logical
beq  a1, a2, label
bne  a1, a2, label
blt  a1, a2, label
bgt  a1, a2, label
jal  ra, func          ; call
jalr zero, ra, 0       ; return
addi sp, sp, -8        ; push equivalent (manual)
sd   a0, 0(sp)
ld   a0, 0(sp)         ; pop equivalent
addi sp, sp, 8
nop
wfi
ecall                  ; syscall
```

### Which Architecture to Learn?

RISC-V is the best starting point — regular, unambiguous, and all the concepts (registers, memory, stack, calling conventions) transfer directly to other architectures. Once comfortable, x86-64 is worth learning separately since it's unavoidable for systems work, reverse engineering, and debugging on Linux/Windows.

---

## 9. First Program

```cpp
#include <iostream>

int main() {
    int num, sum = 0;
    while (std::cin >> num) {
        sum += num;
    }
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}
```

**Notes:**

- `#include` is a preprocessor directive — it pulls the contents of `iostream` into the translation unit before compilation.
- When `num` is declared without initialisation (`int num`), its value is **undefined** — it contains whatever bytes happen to be in that memory location. The C++ standard guarantees nothing about uninitialised memory. The OS zeroes memory between processes, but within a process memory is reused without clearing.
- The grammar/parsing concepts from section 4 apply here: `int num` → lexed into `[int] [num]` → parsed as a declaration → code generated.

---

## 10. Grammar and Parsing (Detailed)

**Grammar** — the rules that define valid syntax. Like English has rules ("subject verb object"), C++ has rules:

```
valid:    int x = 5;
invalid:  int = x 5;
```

**Parsing** — reading text, checking it follows the grammar, and building a tree structure. Parsing is not code generation — it's an earlier step (see compiler internals in section 4).

---

## Open Questions

**Tooling and workflow**

- How do you typically debug C++? How do you enter debug mode and inspect breakpoints?
- What is `g++ -g`? What can you do in debug mode that you can't in normal execution?
- How do you run tests in C++?
- How do you deploy a C++ binary to production?
- Is `g++` installed by default? What are the complications of installing it?
- What is `make`? How do build automation tools like make/build2 work?
- Most useful VS Code config files for C++ (`.vscode/c_cpp_properties.json`, `launch.json`, `tasks.json`)?

**Language and compilation**

- What are the most common C++ mistakes / things not to do?
- Difference between compiling for Linux vs Windows — do you need to consider the platform explicitly?
- Will only used functions from `#include`'d headers be compiled into the final binary?
- For each step of the process (compilation, linking), what are the main failure modes and how do you debug them?
- What features did each C++ version (C++11 through C++23) introduce?
- Does a debug build (no optimisations, with symbols) always behave the same as an optimised release build?

**Large codebases and production systems**

- How are large C++ codebases structured and built? Are components compiled separately and linked?
- For a trading system, what would the main C++ programs be? How are they named/organised?
- Do production C++ projects use IDE workspaces/solutions, or are those just for development?
- How do you bind C++ to other languages (Python, etc.)?

**Remaining reading**

- Statements and program structure: https://www.learncpp.com/cpp-tutorial/statements-and-the-structure-of-a-program/
- Compiler extensions: https://www.learncpp.com/cpp-tutorial/configuring-your-compiler-compiler-extensions/
- C++ introduction: https://www.learncpp.com/cpp-tutorial/introduction-to-cplusplus/

---
