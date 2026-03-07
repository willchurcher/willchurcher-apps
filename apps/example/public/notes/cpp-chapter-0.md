# Chapter 0 — Notes


---

# Introduction to These Tutorials

## Lesson Goals

- Cover general programming topics alongside C++ (style, debugging, good/bad practices, testing)
- Provide clear, concise examples without ellipsis omissions or unexplained new concepts
- Avoid bad habits by teaching both how to program *and* how **not** to program in C++

## Recommended Learning Practices

- Type examples by hand; do not copy-paste
- Fix mistakes and bugs yourself before seeking help
- Experiment with examples: change values, add features, intentionally break programs
- Write short original programs to reinforce each concept
- Learn to use a debugger — covered in a later chapter

## Getting Unstuck

1. Read existing comments on the lesson page
2. Scan the next one or two lessons — the answer may be there
3. Search the web for the concept or error message
4. Ask an AI (verify correctness independently)
5. Ask on a programming Q&A site (e.g. Stack Overflow)
6. Skip and return later with more context

## Site Reference Tools

- **Site index**: searchable list of topics with links to relevant lessons
- **Stroustrup glossary**: C++ terms defined by the language creator

---

# 0.2 — Introduction to Programs and Programming Languages

## Core Definitions

• **Computer program**: a sequence of instructions directing a computer to perform actions in a specified order
• **Programming language**: a language designed to facilitate writing instructions for computers
• **Programming**: the act of writing a program
• **Running / executing**: a computer actively performing the instructions in a program
• **Hardware**: physical components of a computer (CPU, memory, storage, I/O devices)
• **Software**: programs designed to be executed on hardware
• **Platform**: a compatible set of hardware and software providing an environment for programs to run
• **Portable**: a program that can be easily transferred from one platform to another
• **Porting**: modifying a program so it runs on a different platform

---

## Language Levels Overview

```
Abstraction Level
High ▲  Scripting (Python, JS, Perl)
     │  C, C++, Pascal, Java
     │  Assembly language
Low  ▼  Machine language
```

---

## Machine Language

• **Machine language / machine code**: the only instruction set a CPU can natively process
• **Instruction set**: the complete set of machine language instructions a given CPU understands
• **Bit (binary digit)**: a single `0` or `1`; machine instructions are sequences of bits

```
10110000 01100001   ← example machine language instruction
```

Key constraints:
- Each CPU family has its own machine language
- Machine language from one CPU family is **incompatible** with another
- Programs written in machine language are **not portable**

---

## Assembly Language

• **Assembly language**: a human-readable form of machine language using mnemonics instead of binary
• **Assembler**: a program that translates assembly into machine language
• Each CPU family has its own assembly language

```
mov al, 0x61    ← x86 assembly equivalent of 10110000 01100001
```

Components of an assembly instruction:
- **Mnemonic** — short name for the operation (e.g. `mov` = move/copy)
- **Register name** — e.g. `al` (a named fast-memory location inside the CPU)
- **Operand** — value in decimal or hexadecimal (e.g. `97` or `0x61`)

---

## Low-Level Languages: Summary

| Property | Machine Language | Assembly |
|---|---|---|
| Human readable | No | Somewhat |
| Portable | No | No |
| Requires arch knowledge | Yes | Yes |
| Speed | Fastest | Fast |

**Downsides of low-level languages:**
- Not portable across CPU families
- Requires detailed architectural knowledge
- Hard to understand at scale
- Only primitive capabilities — programmer implements everything manually

**Benefit:** Maximum performance; still used for performance-critical code sections.

---

## High-Level Languages

Example of the same operation at each level:

```
Machine:   10110000 01100001
Assembly:  mov al, 0x61
C++:       a = 97;
```

### Compilation

• **Compiler**: a program that translates source code (high-level) into another language (usually machine code)

```
┌─────────────┐     ┌──────────┐     ┌──────────────────┐
│  C++ Source │────▶│ Compiler │────▶│  Executable File │
│   (.cpp)    │     └──────────┘     │  (machine code)  │
└─────────────┘                      └──────────────────┘
```

- Output executable runs **without** the compiler being installed
- Compiler can also output assembly for inspection

### Interpretation

• **Interpreter**: a program that directly executes source code without prior compilation

```
┌─────────────┐     ┌─────────────┐     ┌────────┐
│   Source    │────▶│ Interpreter │────▶│ Output │
│   Code      │     └─────────────┘     └────────┘
```

- More flexible, but slower (translation happens **every** run)
- Interpreter must be installed on every target machine

### Compiled vs Interpreted

| Property | Compiled | Interpreted |
|---|---|---|
| Speed | Faster | Slower |
| Flexibility | Less | More |
| Requires runtime tool | No | Yes (interpreter) |
| Source distribution | Not required | Often required |
| C++ uses | ✓ | ✗ |

---

## High-Level Language Benefits

- **Abstraction**: `a = 97;` requires no knowledge of memory addresses or CPU registers
- **Portability**: one C++ source file can compile on every platform with a C++ compiler
- **Readability**: instructions resemble natural language and mathematics
- **Conciseness**: `a = b * 2 + 5;` in one line vs 4–6 assembly instructions
- **Built-in capabilities**: e.g. searching text requires a single instruction

• **Cross-platform**: a program designed to run on multiple platforms

### Portability Inhibitors (C++)

- Use of OS-specific APIs (e.g. Windows-only calls)
- Third-party libraries unavailable on target platforms
- Compiler-specific extensions
- Implementation-defined behavior allowed by the C++ standard

---

## Terminology Conventions

| Term | Meaning |
|---|---|
| **Rule** | Must follow; violation breaks the program |
| **Best practice** | Should follow; conventional or superior approach |
| **Warning** | Should avoid; leads to unexpected results |

---

# 0.3 — Introduction to C/C++

## C Language Origins

- Developed in **1972** by Dennis Ritchie at Bell Telephone Laboratories
- Primary purpose: systems programming (writing operating systems)
- Design goals:
  - Easy to compile
  - Efficient memory access
  - Efficient code generation
  - Self-contained (minimal external dependencies)
  - High programmer control with cross-platform portability

## C Standardization Timeline

```
1972 ── C created (Ritchie)
1973 ── Unix rewritten in C
1978 ── K&R book published (de facto standard)
1989 ── C89 / ANSI C (formal standard)
1990 ── C90 (ISO adoption of ANSI C)
1999 ── C99 (new ISO release)
```

## C++ Origins and Standardization

- Developed by **Bjarne Stroustrup** at Bell Labs starting in **1979**
- Extension of C; adds object-oriented programming support
- Not a strict superset of C (C99 has features absent from C++)

### C++ Standards Timeline

```
1998 ── C++98 (first ISO standard)
2003 ── C++03 (minor update)
2011 ── C++11 (major; widely considered new baseline)
2014 ── C++14
2017 ── C++17
2020 ── C++20
2023 ── C++23
```

- • **Standards document**: formal ISO-approved description of the C++ language
- Informal naming convention uses last two digits of publication year (e.g., C++20)
- Updates are expected approximately every three years

## C/C++ Design Philosophy

> "Trust the programmer"

- Grants high freedom; minimal guardrails
- The language will not prevent nonsensical operations if it cannot determine intent
- Knowing what **not** to do is nearly as important as knowing what to do

## C++ Strengths

C++ excels where **high performance** and **precise resource control** are required:

- Video games
- Real-time systems (transportation, manufacturing)
- High-frequency trading / financial applications
- Graphical applications and simulations
- Productivity / office applications
- Embedded software
- Audio and video processing
- AI and neural networks

## Key Distinctions

| Property | C | C++ |
|---|---|---|
| Created | 1972 | 1979 |
| OOP support | No | Yes |
| First standard | 1989 (C89) | 1998 (C++98) |
| Typical use today | Embedded, FFI | General high-performance |

- Prior C knowledge is **not required** to learn C++
- C++ knowledge makes learning C straightforward if needed later

---

# C++ Development Process

## The Development Steps

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: Define the problem                             │
│  Step 2: Determine how to solve it                      │
│  Step 3: Write the program                              │
│  Step 4-7: Build and test (covered in next lesson)      │
└─────────────────────────────────────────────────────────┘
```

## Step 1: Define the Problem
Clearly state *what* the program should do before writing any code.

## Step 2: Determine the Solution

Jumping straight to coding leads to fragile, hard-to-maintain programs.

**Characteristics of a good solution:**
- Straightforward — not overly complicated or confusing
- Well documented — especially assumptions and limitations
- Modular — parts can be reused or changed independently
- Resilient — recovers gracefully or gives useful error messages

**Time reality:** On complex systems, only 10–40% of programmer time is writing new code; 60–90% is maintenance (debugging, updates, enhancements, internal improvements).

• **Bug**: any programming error that prevents correct operation
• **Debugging**: the process of finding and removing bugs

## Step 3: Write the Program

### Required Components
- Knowledge of the programming language
- A text editor or code editor to write and save source code

• **Source code**: the set of C++ instructions written in a text editor

### Code Editor vs. Plain Text Editor

A **code editor** provides features critical for programming:

| Feature | Benefit |
|---|---|
| Line numbering | Locate compiler errors by line number |
| Syntax highlighting | Visually distinguish program components |
| Monospace/fixed-width font | Disambiguates `0`/`O`, `1`/`l`/`I`; enables alignment |

```cpp
#include <iostream>

int main()
{
    std::cout << "Here is some text.";
    return 0;
}
```

### Source File Naming

- C++ has no formal file-naming requirements
- De-facto standard: name the primary file `main.cpp`
  - `main` identifies it as the entry point
  - `.cpp` marks it as a C++ source file
- Other extensions seen in practice: `.cc`, `.cxx`
- Other naming conventions: program name (e.g. `calculator.cpp`)

> **Best practice:** Name the primary source file `main.cpp`.

### Source File Count
- Simple programs: one `.cpp` file
- Complex programs: potentially hundreds or thousands of source files

---

# 0.5 — Introduction to the Compiler, Linker, and Libraries

## Development Pipeline Overview

```
┌─────────────┐    Step 4     ┌─────────────┐
│  source.cpp │ ─────────────▶│  source.o   │
├─────────────┤   Compiler    ├─────────────┤    Step 5     ┌─────────────────┐
│  main.cpp   │ ─────────────▶│  main.o     │ ─────────────▶│  executable /   │
├─────────────┤               ├─────────────┤    Linker     │  library file   │
│  util.cpp   │ ─────────────▶│  util.o     │               └─────────────────┘
└─────────────┘               └──────┬──────┘                       ▲
                                     │                               │
                              ┌──────▼──────┐               ┌───────┴──────┐
                              │  library    │───────────────▶│   linked in  │
                              │  files (.a) │                └──────────────┘
                              └─────────────┘
```

## Step 4: Compilation

The C++ compiler processes each `.cpp` file sequentially and performs two tasks:

1. **Validates** source code against C++ language rules; emits errors with line numbers on failure and aborts.
2. **Translates** valid C++ into machine language instructions stored in an **object file**.

• **Object file**: intermediate binary file produced by the compiler from one `.cpp` file; named `name.o` or `name.obj`.

Each `.cpp` file produces exactly one object file:

```
source.cpp  ──▶  source.o
main.cpp    ──▶  main.o
util.cpp    ──▶  util.o
```

## Step 5: Linking

• **Linker**: program that combines object files and library files into a final output file.
• **Linking**: the process the linker performs.
• **Library file**: a collection of precompiled code packaged for reuse in other programs.

### Linker tasks (in order)

1. Reads each object file and validates it.
2. Resolves cross-file dependencies — connects a use of something in one `.cpp` to its definition in another.
3. Links in library files (standard and/or third-party).
4. Outputs the final file (executable or library).

A **linker error** occurs when a reference cannot be matched to a definition; linking aborts.

### Standard Library

• **C++ Standard Library**: extensive library shipped with C++; provides reusable capabilities for all programs.
• **iostream**: the input/output portion of the standard library; handles monitor output and keyboard input.
• Most linkers link the standard library automatically — no manual configuration needed.

### Third-Party Libraries

• **Third-party libraries**: libraries created by independent entities, not part of the C++ standard.
• Used when the standard library lacks needed functionality (e.g., audio playback, graphics).
• Must be explicitly linked into a project.

## Building

• **Building**: the full process of converting source files into a runnable executable.
• **Build**: the specific executable produced by one run of that process.

```
Source files
    │
    ▼  Step 4
Object files
    │
    ▼  Step 5
Executable  ◀── "a build"
```

### Build Automation Tools

| Tool | Purpose |
|------|---------|
| `make` | Automates compilation and linking via rules |
| `build2` | Modern C++ build system |

These are external to the C++ language; not required for basic development.

## Steps 6 & 7: Testing and Debugging

• **Testing**: assessing whether software behaves as expected across different inputs.
• **Debugging**: finding and fixing programming errors revealed by testing.

## Integrated Development Environments (IDEs)

• **IDE**: software package that bundles editor, compiler, linker, and debugger into one tool.
• Covers steps 3, 4, 5, and 7 of the development pipeline in a single interface.

---

# 0.6 — Installing an Integrated Development Environment (IDE)

## What Is an IDE?

• **IDE (Integrated Development Environment)**: software that combines tools for writing, building, and debugging programs into a single interface.

### Typical IDE Features
- File management for source code
- Code editor with line numbering, syntax highlighting, name completion, and auto-formatting
- Build system to compile, link, and run programs
- Integrated debugger
- Plugin system for extensions (e.g., version control)

---

## Compiler Version Requirements

```
Minimum versions with C++17 support:
┌─────────────────────────┬──────────────┐
│ Compiler                │ Min Version  │
├─────────────────────────┼──────────────┤
│ GCC / G++               │ 7            │
│ Clang++                 │ 8            │
│ Visual Studio           │ 2017 (15.7)  │
└─────────────────────────┴──────────────┘
```

- Recommended: newest available version of compiler and IDE.
- Minimum acceptable standard: **C++11**.
- Recommended minimum standard: **C++17**.

---

## Recommended IDEs by Platform

```
┌──────────────┬──────────────────────────────────────────────────┐
│ Platform     │ Recommended IDE                                  │
├──────────────┼──────────────────────────────────────────────────┤
│ Windows      │ Visual Studio 2022 Community                     │
│ Linux        │ Code::Blocks                                     │
│ Windows+Linux│ Code::Blocks                                     │
│ macOS        │ Xcode or Eclipse (with C++ plugin)               │
│ Experienced  │ Visual Studio Code (Linux / macOS / Windows)     │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## Visual Studio 2022 (Windows)

- Download **Visual Studio 2022 Community**.
- During install, select workload: **Desktop development with C++**.
- Ensure **Windows 11 SDK** (or Windows 10 SDK) is checked.

---

## Code::Blocks (Linux / Windows)

### Windows Installation
- Download the build ending in `mingw-setup.exe` — this bundles MinGW (GCC port for Windows).

### Updating MinGW for C++20 Support
Code::Blocks 20.03 ships with an outdated MinGW (C++17 only). To update:

1. Install Code::Blocks, then close it.
2. Open File Explorer (`Win-E`), navigate to install directory (e.g., `C:\Program Files (x86)\CodeBlocks`).
3. Rename `MinGW` → `MinGW.bak`.
4. Go to [https://winlibs.com/](https://winlibs.com/).
5. Download: *Release Versions → UCRT Runtime → LATEST → Win64 → without LLVM/Clang/LLD/LLDB → Zip archive*.
6. Extract `mingw64` folder into the Code::Blocks install directory.
7. Rename `mingw64` → `MinGW`.
8. Confirm it works, then delete `MinGW.bak`.

### Linux Installation
- Debian/Ubuntu/Mint: `sudo apt-get install build-essential`
- Arch Linux: install `base-devel`

### First Launch
- If *Compilers auto-detection* dialog appears, set **GNU GCC Compiler** as default, click **OK**.

### Troubleshooting: "Can't find compiler executable"
1. Confirm you downloaded the `mingw` version (Windows only).
2. Settings → Compiler → **Reset to defaults**.
3. Settings → Compiler → Toolchain Executables → set *Compiler's installation directory* to MinGW path (e.g., `C:\Program Files (x86)\CodeBlocks\MinGW`).
4. Full uninstall then reinstall.
5. Try a different compiler.

---

## Visual Studio Code (Experienced Users Only)

- Not recommended for beginners — complex configuration.
- Follow platform-specific setup guides from the VS Code documentation.
- Requires separate C++ configuration steps after installation.

| Platform | Action |
|----------|--------|
| Linux    | Install via distro package manager; configure C++ for Linux |
| macOS    | Follow VS Code macOS guide; configure C++ for Mac |
| Windows  | Follow VS Code Windows guide; configure C++ for Windows |

---

## Web-Based Compilers (Temporary Alternative)

| Compiler | Notable Feature |
|----------|----------------|
| TutorialsPoint | General use |
| Wandbox | Choose GCC or Clang version |
| Godbolt | View assembly output |

- Suitable for simple exercises only.
- Limitations: no multi-file projects, no interactive input, limited debugging.

---

## IDEs to Avoid

| IDE | Reason |
|-----|--------|
| Borland Turbo C++ | Does not support C++11 |
| Visual Studio for Mac | Does not support C++ |
| Dev C++ | No longer actively maintained |

---

## Installation Troubleshooting

1. Uninstall the IDE.
2. Reboot the machine.
3. Temporarily disable antivirus/anti-malware.
4. Reinstall.
5. If still failing: try a different IDE, or search the exact error message online.

---

# 0.7 — Compiling Your First Program

## Key Concepts

• **Project**: a container holding all source files and assets needed to produce an executable, plus saved IDE/compiler/linker settings
• **Console project**: a program that runs in the OS terminal, reads from keyboard, prints text, produces a stand-alone executable — no GUI
• **Workspace / Solution**: an IDE container that holds one or more related projects
• **Cache**: storage of compiled object files on disk to avoid redundant recompilation on subsequent builds

## Project Rules

- One project per program
- Create a new workspace/solution for each program (especially while learning)
- Project files are IDE-specific; projects must be recreated when switching IDEs

## Hello World Program

```cpp
#include <iostream>

int main()
{
    std::cout << "Hello, world!";
    return 0;
}
```

## IDE Build Commands Summary

| Option | What It Does |
|---|---|
| **Build** | Compiles only *modified* files, then links into executable; does nothing if nothing changed |
| **Clean** | Removes all cached object files and executables |
| **Rebuild** | Clean + Build (full recompile) |
| **Compile** | Recompiles one file only; does not link or produce executable |
| **Run/Start** | Executes prior built executable; some IDEs (VS) auto-build first |

## Command-Line Compilation (g++)

```bash
g++ -o HelloWorld HelloWorld.cpp   # compile and link
./HelloWorld                        # run (Linux/macOS)
HelloWorld                          # run (Windows)
```

## Precompiled Headers

- Improve compile speed in large projects only
- Add extra setup overhead
- **Disable for tutorial-sized projects**; enable later if compile times become a problem

## Console Window Closes Immediately (Fix)

Add near the top of the file:

```cpp
#include <iostream>
#include <limits>
```

Add before `return` in `main()`:

```cpp
std::cin.clear();
std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
std::cin.get();
```

- Do **not** use `system("pause")` — not portable

## Build Process Flow

```
Source files (.cpp)
        │
        ▼ Compile (modified files only)
Object files (.o / .obj)  ◄── cached on disk
        │
        ▼ Link
   Executable (.exe)
```

---

# Common C++ Problems

## Runtime Issues

### Console Window Closes Immediately
Add to the top of the file:
```cpp
#include <iostream>
#include <limits>
```
Add before `return` in `main()`:
```cpp
std::cin.clear(); // reset any error flags
std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n'); // discard input buffer until newline
std::cin.get(); // wait for keypress
```
- Avoid `system("pause")` — not portable.
- Visual Studio: use **Ctrl-F5** (Start Without Debugging) if F5 doesn't pause.

### No Output Despite Window Appearing
Antivirus/malware may block execution; disable temporarily to test.

---

## Compile-Time Issues

### Unresolved External Symbol `_main` or `_WinMain@16`
Compiler cannot find `main()`. Check:
- A function named exactly `main` exists.
- `main` is spelled correctly.
- The file containing `main` is part of the project and gets compiled.
- Project type is **console**, not GUI.

### Multiple Definitions of `main`
A C++ program may have only one `main` function; remove all duplicates.

### C++11/14/17 Features Not Working
- Old compiler: upgrade.
- Modern compiler defaulting to older standard: change the language standard setting (see lesson 0.12).

### Cannot Open `.exe` for Writing (LNK1168)
Possible causes:
- The `.exe` is currently running — close it, then recompile.
- Antivirus is blocking creation/replacement of the executable.
- File is locked — reboot to release locks, then recompile.

### `cin`, `cout`, or `endl` Undeclared Identifier
1. Add `#include <iostream>` at the top of the file.
2. Prefix each use with `std::`:
```cpp
std::cout << "Hello" << std::endl;
```

### `end1` Undeclared Identifier
`endl` uses a lowercase letter **l**, not the digit **1**.
Use a programming font that clearly distinguishes:

```
Letter l  vs  Number 1
Letter O  vs  Number 0
Letter I  vs  Letter l
```

---

## Visual Studio–Specific Issues

### Fatal Error C1010: Unexpected End of File (Precompiled Headers)
Cause: precompiled headers enabled but file does not include the header.

Fix (preferred): disable precompiled headers (see lesson 0.7).

Fix (alternative): add as the **first line** of every `.cpp` file:
```cpp
#include "pch.h"   // modern VS
// or
#include "stdafx.h" // older VS
```

### LNK2022: Unresolved `_WinMain@16`
Project was created as a Windows GUI application, not a console application; recreate as a **Windows Console** project.

### Warning: Cannot Find or Open PDB File
Not an error; does not affect execution.
To suppress: **Debug → Options and Settings → Symbols** → check **Microsoft Symbol Server**.

---

## General Troubleshooting Strategy

```
Problem encountered
       │
       ▼
Search engine (paste exact error message in quotes)
       │
       ▼
Ask an AI (prefix with "In C++, ...")
       │
       ▼
Post on Q&A board (e.g. Stack Overflow)
  - Include: OS, IDE, exact error, relevant code
```

• **Term**: AI caveat — AI responses may be inaccurate, outdated, or not follow modern best practices.

---

# Build Configurations

## Overview

• **Build configuration** (build target): a collection of project settings controlling how an IDE builds a project (output name, library paths, debug info, optimization level, etc.)

Most IDEs generate two configurations automatically:

```
┌─────────────────────────────────────────────────────────┐
│              Build Configurations                       │
├──────────────────┬──────────────────────────────────────┤
│  Debug           │  Release                             │
├──────────────────┼──────────────────────────────────────┤
│ Optimizations OFF│ Optimizations ON                     │
│ Debug info ON    │ Debug info OFF                       │
│ Larger/slower    │ Smaller/faster                       │
│ Easier to debug  │ Better performance                   │
│ Default active   │ Use for distribution/perf testing    │
└──────────────────┴──────────────────────────────────────┘
```

## Debug Configuration

• **Debug configuration**: build mode with optimizations disabled and full debugging information included.
- Produces larger, slower executables.
- Makes debugging significantly easier.
- Should be the active configuration during development.

## Release Configuration

• **Release configuration**: build mode optimized for size and performance, without debugging information.
- Used when distributing executables to others.
- Used when testing program performance.

## Compiler Flags (GCC / Clang)

| Mode    | Flags               |
|---------|---------------------|
| Debug   | `-ggdb`             |
| Release | `-O2 -DNDEBUG`      |

### Optimization Levels

- **`-O0`**: no optimization — recommended for debug builds (default).
- **`-O2`**: standard optimizations — recommended for release builds.
- **`-O3`**: aggressive optimizations — may or may not outperform `-O2`; measure before choosing.

## Switching Configurations

| Toolchain       | How to Switch                                                                 |
|-----------------|-------------------------------------------------------------------------------|
| Visual Studio   | *Solution Configurations* dropdown in Standard Toolbar, or *Build > Configuration Manager* |
| Code::Blocks    | *Build Target* dropdown in Compiler Toolbar                                   |
| GCC/Clang CLI   | Pass appropriate flags manually (see table above)                             |
| VS Code         | Edit `"args"` section in `.vscode/tasks.json`                                 |

### VS Code `tasks.json` — Debug Args
```cpp
"-ggdb",
"${file}"
```

### VS Code `tasks.json` — Release Args
```cpp
"-O2",
"-DNDEBUG",
"${file}"
```

## Best Practices

- Use **debug** configuration while writing and testing code.
- Use **release** configuration when distributing or benchmarking.
- Apply any project setting change to **all build configurations** to avoid inconsistencies.

---

## Compiler Extensions

### What Are Compiler Extensions

• **Compiler extension**: a compiler-specific modification to the C++ language, added for compatibility or historical reasons

Compiler extensions can:
- Make programs incompatible with the C++ standard
- Prevent compilation on other compilers
- Cause incorrect behavior on other systems

Compiler extensions are enabled by default in many compilers — code that relies on them may appear valid but is non-standard.

### Why Disable Them

- Extensions are never required to write correct C++ programs
- Relying on them creates non-portable code
- New learners may mistake extension behavior for standard behavior

**Rule**: Disable compiler extensions so programs remain C++-standard-compliant and portable.

---

### Disabling Compiler Extensions

#### Visual Studio
1. Right-click project in *Solution Explorer* → *Properties*
2. Set *Configuration* to *All Configurations*
3. Navigate to *C/C++ → Language*
4. Set *Conformance mode* to **Yes (/permissive-)**

#### Code::Blocks
- *Settings → Compiler → Compiler flags tab*
- Enable `-pedantic-errors`

#### GCC / Clang (command line)
Add flag to compile command:
```
-pedantic-errors
```

#### VS Code
In `tasks.json`, locate `"args"`, find `"${file}"`, and insert above it:
```json
"-pedantic-errors",
```

Also enable automatic final newline insertion:
- *File → Preferences → Settings*
- Search `insert final newline`
- Check *Files: Insert Final Newline* in both *Workspace Settings* and *User Settings*

---

### Important Note

These settings are **per-project** — they must be configured for every new project, or saved into a reusable project template.

---

# 0.11 — Configuring Your Compiler: Warning and Error Levels

## Diagnostic Messages

• **Ill-formed program**: code that definitively violates the rules of the C++ language
• **Diagnostic message**: output emitted by the compiler when it encounters an issue
• **Diagnostic error**: compiler halts compilation; issue is too serious to proceed
• **Diagnostic warning**: compiler continues compilation; issue is noted but not blocking
• **Compilation error**: a diagnostic error generated during compilation

Diagnostic messages typically include:
- Filename and line number where the issue was found
- Description of what was expected vs. what was found

The actual issue may be on the reported line or on a preceding line.

## Warning vs. Error Behavior

```
Issue encountered by compiler
        │
        ▼
┌───────────────────────┐
│ Violates language     │──Yes──▶ Diagnostic Error ──▶ Compilation halted
│ rules definitively?   │
└───────────────────────┘
        │ No
        ▼
┌───────────────────────┐
│ Looks suspicious but  │──Yes──▶ Diagnostic Warning ──▶ Compilation continues
│ still legal?          │
└───────────────────────┘
        │ No
        ▼
   No diagnostic
```

> Compilers may disagree: one compiler may emit an error where another emits a warning for the same issue.

## Best Practices

- **Resolve warnings immediately** — do not let them accumulate; a serious warning may be buried among trivial ones
- **Increase warning levels** — the compiler's default level catches only obvious issues
- **Enable "treat warnings as errors"** — forces resolution of all warnings before compilation succeeds

## Increasing Warning Levels

### Visual Studio
- Right-click project → *Properties* → set *Configuration* to **All Configurations**
- *C/C++ > General* → set *Warning Level* to **Level4 (/W4)**
- *C/C++ > Command Line* → add `/w44365` (enables signed/unsigned conversion warnings)
- *C/C++ > External Includes* → set *External Header Warning Level* to **Level3 (/external:W3)**

### Code::Blocks
- *Settings > Compiler > Compiler settings tab* → enable `-Wall`, `-Weffc++`, `-Wextra`
- *Other compiler options tab* → add `-Wconversion -Wsign-conversion`

### GCC (command line)
```
-Wall -Weffc++ -Wextra -Wconversion -Wsign-conversion
```

### VS Code (`tasks.json` — add before `"${file}"`)
```cpp
"-Wall",
"-Weffc++",
"-Wextra",
"-Wconversion",
"-Wsign-conversion",
```

## Treat Warnings as Errors

### Visual Studio
- *C/C++ > General* → set *Treat Warnings As Errors* to **Yes (/WX)**

### Code::Blocks
- *Other compiler options tab* → add `-Werror`

### GCC (command line)
```
-Werror
```

### VS Code (`tasks.json` — add before `"${file}"`)
```cpp
"-Werror",
```

## Linker Diagnostics

The **linker** can also emit diagnostic errors when linking fails (e.g., unresolved symbols). These are separate from compiler diagnostics but follow the same halt-on-error behavior.

---

# C++ Language Standard Configuration

## Language Standard Versions

| Publication Year | Formal Name | Conventional Name | Development Name | Notes |
|---|---|---|---|---|
| 2011 | ISO/IEC 14882:2011 | C++11 | C++0x | |
| 2014 | ISO/IEC 14882:2014 | C++14 | C++1y | |
| 2017 | ISO/IEC 14882:2017 | C++17 | C++1z | |
| 2020 | ISO/IEC 14882:2020 | C++20 | C++2a | |
| 2024 | ISO/IEC 14882:2024 | C++23 | C++2b | Finalized 2023 |
| TBD | TBD | C++26 | C++2c | |

- • **Standards document**: formal technical document describing the authoritative rules for a given language standard; written for compiler implementers, not learners
- • **Development name**: informal name used before a standard's publication year is known (e.g., `C++0x` for C++11, which was expected before 2010)

## Choosing a Language Standard

```
Professional:  latest − 1 or − 2  (compiler defects resolved, best practices established)
Personal/learning:  latest finalized standard
```

- Non-finalized (upcoming) standards may have incomplete or buggy compiler support.
- This site targets **C++17**; some C++20/C++23 content is also available.

## Configuring the Standard by Toolchain

### Visual Studio
- Default: C++14
- Path: *Project → Properties → Configuration Properties → C/C++ → Language*
- Set *Configuration* to **All Configurations** first
- Recommended setting: **ISO C++ Latest (`/std:c++latest`)**
- Must be set **per project**; re-apply when creating a new project

### Code::Blocks
- Path: *Settings → Compiler… → checkbox list*
- Select the highest available ISO standard checkbox (C++17, C++20, C++23)
- Setting is **global** (applies to all projects)
- Manual alternative (Other compiler options tab):

```
-std=c++17
-std=c++20
-std=c++23
-std=c++2c   ← experimental upcoming standard
```

### GCC / G++ / Clang (command line)

```bash
g++ -std=c++17 file.cpp
g++ -std=c++20 file.cpp
g++ -std=c++23 file.cpp
g++ -std=c++2c file.cpp   # experimental C++26
# GCC 8/9 only:
g++ -std=c++2a file.cpp   # C++20
```

### VS Code
- Add the flag to `tasks.json` → `"args"` section, before `"${file}"`:

```json
"-std=c++20",
```

- Sync IntelliSense in `settings.json`:

```json
"C_Cpp.default.cppStandard": "c++20"
```

## Exporting Configuration

| IDE | Method |
|---|---|
| Visual Studio | *Project → Export Template* → "Project template" |
| Code::Blocks | *File → Save project as template* → appears under "User templates" |

## Compiler Support Gaps

```
Compile failure causes:
┌─────────────────────────────────────────────────────┐
│  1. Compiler configured to older standard           │
│     → select newer standard; verify with lesson 0.13│
│                                                     │
│  2. Compiler version has missing/buggy feature impl │
│     → upgrade compiler, or switch compilers         │
└─────────────────────────────────────────────────────┘
```

- CPPReference tracks per-feature support by compiler and standard version (see "Compiler Support" tables on cppreference.com).

---

## Detecting Your Compiler's C++ Language Standard

### Purpose

This utility program identifies which C++ language standard your compiler is currently using.

### How It Works

The program queries a preprocessor macro that encodes the active language standard as a `long` integer code.

```
┌─────────────────────┬────────────┬───────────┐
│ Standard            │ Code Value │ Macro     │
├─────────────────────┼────────────┼───────────┤
│ Pre-C++11           │ 199711L    │           │
│ C++11               │ 201103L    │           │
│ C++14               │ 201402L    │ __cplusplus│
│ C++17               │ 201703L    │ (or       │
│ C++20               │ 202002L    │ _MSVC_LANG│
│ C++23               │ 202302L    │ on MSVC)  │
│ C++26 (placeholder) │ 202612L    │           │
└─────────────────────┴────────────┴───────────┘
```

### Macro Selection Logic

```cpp
long getCPPStandard()
{
#if defined(_MSVC_LANG)   // MSVC 2015+: use _MSVC_LANG
    return _MSVC_LANG;
#elif defined(_MSC_VER)   // Older MSVC: cannot determine
    return -1;
#else                     // All conforming compilers
    return __cplusplus;
#endif
}
```

- **`__cplusplus`**: Standard macro defined by all conforming compilers; holds the active standard's numeric code.
- **`_MSVC_LANG`**: MSVC-specific alternative; required because MSVC does not correctly report `__cplusplus` unless a special compiler flag (`/Zc:__cplusplus`) is set.

### Output Behavior

| Condition | Output |
|---|---|
| Code matches a finalized standard exactly | Reports exact standard name |
| Code falls between two standard codes | Reports preview/pre-release of next standard |
| Returns `-1` | Reports inability to determine standard |

### The Program

```cpp
#include <iostream>

const int numStandards = 7;
const long stdCode[numStandards] = { 199711L, 201103L, 201402L, 201703L, 202002L, 202302L, 202612L };
const char* stdName[numStandards] = { "Pre-C++11", "C++11", "C++14", "C++17", "C++20", "C++23", "C++26" };

long getCPPStandard()
{
#if defined(_MSVC_LANG)
    return _MSVC_LANG;
#elif defined(_MSC_VER)
    return -1;
#else
    return __cplusplus;
#endif
}

int main()
{
    long standard = getCPPStandard();

    if (standard == -1)
    {
        std::cout << "Error: Unable to determine your language standard.  Sorry.\n";
        return 0;
    }

    for (int i = 0; i < numStandards; ++i)
    {
        if (standard == stdCode[i])
        {
            std::cout << "Your compiler is using " << stdName[i]
                << " (language standard code " << standard << "L)\n";
            break;
        }
        if (standard < stdCode[i])
        {
            std::cout << "Your compiler is using a preview/pre-release of " << stdName[i]
                << " (language standard code " << standard << "L)\n";
            break;
        }
    }

    return 0;
}
```

### Troubleshooting

| Symptom | Likely Cause |
|---|---|
| Build error | Project configured incorrectly |
| `"Unable to determine"` printed | Non-conforming compiler |
| Unexpected standard printed | IDE/compiler config not applied; per-project setting not set; config file not being read |