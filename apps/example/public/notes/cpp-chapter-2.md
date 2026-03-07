# Chapter 2 — Notes


---

# 2.1 — Introduction to Functions

## Core Definitions

• **Function**: A reusable sequence of statements designed to do a particular job
• **User-defined function**: A function written by the programmer (as opposed to standard library functions)
• **Function call**: An instruction telling the CPU to interrupt the current function and execute another function
• **Caller**: The function initiating the function call
• **Callee**: The function being called/executed
• **Invocation**: Another term for a function call; the caller *invokes* the callee
• **Function header**: The first line of a function definition; tells the compiler the function's name, return type, and parameters
• **Function body**: The curly braces and statements between them; defines what the function does
• **Nested function**: A function defined inside another function — **not supported in C++**

---

## Function Syntax

```cpp
returnType functionName() // function header
{
    // function body
}
```

- `returnType`: use `int` for `main()`, `void` for functions that return nothing
- `functionName`: the identifier used to call the function
- Parentheses `()` after the name signal that this is a function definition

To call a function:
```cpp
functionName(); // parentheses are required
```

> **Gotcha**: Omitting `()` when calling a function will either prevent compilation or silently skip the call.

---

## Execution Flow

```
main() begins
  │
  ▼
statement 1 executes
  │
  ▼
function call → CPU bookmarks current position
  │
  ▼
callee executes top-to-bottom
  │
  ▼
callee returns → CPU resumes from bookmark
  │
  ▼
next statement in main() executes
```

---

## Key Rules

| Rule | Detail |
|---|---|
| Define before call | A function must be defined before it can be called (see 2.7 for workarounds) |
| No nesting | Function definitions cannot appear inside other function definitions |
| Reusable | A function can be called any number of times |
| Call chains | Functions may call other functions arbitrarily deep |

---

## Examples

### Basic call
```cpp
#include <iostream>

void doPrint()
{
    std::cout << "In doPrint()\n";
}

int main()
{
    std::cout << "Starting main()\n";
    doPrint();                         // suspends main(), runs doPrint()
    std::cout << "Ending main()\n";
    return 0;
}
```
Output:
```
Starting main()
In doPrint()
Ending main()
```

### Calling a function multiple times
```cpp
int main()
{
    doPrint(); // first call
    doPrint(); // second call
    return 0;
}
```
Each call is independent; the function body executes fully each time.

### Chained calls
```cpp
void doB() { std::cout << "In doB()\n"; }

void doA()
{
    std::cout << "Starting doA()\n";
    doB();
    std::cout << "Ending doA()\n";
}

int main()
{
    std::cout << "Starting main()\n";
    doA();
    std::cout << "Ending main()\n";
    return 0;
}
```
Output:
```
Starting main()
Starting doA()
In doB()
Ending doA()
Ending main()
```

### Illegal — nested function (does not compile)
```cpp
int main()
{
    void foo() // ERROR: nested function not allowed
    {
        std::cout << "foo!\n";
    }
    return 0;
}
```
**Fix**: move `foo()` outside of `main()`.

---

# 2.2 — Function Return Values (Value-Returning Functions)

## Core Concepts

• **Return type**: the type declared before a function's name; specifies what type of value the function sends back to the caller
• **Return statement**: `return <expression>;` — evaluates the expression and sends the result back to the caller
• **Return expression**: the expression following the `return` keyword that produces the value
• **Return value**: the copy of the return expression's result that is sent to the caller
• **Return by value**: the process of copying a value back to the caller
• **Value-returning function**: any function whose return type is not `void`
• **Status code**: the value returned by `main()` to signal success or failure to the OS

## Return Statement Execution

```
return <expression>;
       │
       ▼
┌──────────────────────────┐
│ 1. Evaluate expression   │
│ 2. Copy result to caller │
│ 3. Exit function         │
└──────────────────────────┘
```

## Syntax

```cpp
int returnFive()        // return type: int
{
    return 5;           // return statement with return expression: 5
}

int main()
{
    std::cout << returnFive() << '\n';      // prints 5
    std::cout << returnFive() + 2 << '\n'; // prints 7
    returnFive();                           // valid; return value discarded
    return 0;
}
```

## Using Return Values

```cpp
int getValueFromUser()
{
    std::cout << "Enter an integer: ";
    int input{};
    std::cin >> input;
    return input;           // returns value entered by user
}

int main()
{
    int num{ getValueFromUser() };  // initialize with return value
    std::cout << num << " doubled is: " << num * 2 << '\n';
    return 0;
}
```

## Rules for Value-Returning Functions

| Rule | Detail |
|------|--------|
| Must return a value | Omitting `return` causes **undefined behavior** |
| Returns exactly one value | Cannot return multiple values in a single call |
| `main()` exception | Implicitly returns `0` if no `return` is present (but explicit is best practice) |
| `main()` must return `int` | Any other return type is a compile error |
| `main()` cannot be called explicitly | Explicit calls to `main()` are disallowed in C++ |

### Undefined Behavior Example

```cpp
int getBadValue()
{
    std::cout << "Enter an integer: ";
    int input{};
    std::cin >> input;
    // no return statement → undefined behavior
}
```

## main() and Status Codes

```cpp
#include <cstdlib>  // for EXIT_SUCCESS, EXIT_FAILURE

int main()
{
    return EXIT_SUCCESS;  // equivalent to 0
    // return EXIT_FAILURE; // indicates unsuccessful termination
}
```

| Status Code | Meaning |
|-------------|---------|
| `0` | Program ran normally |
| `EXIT_SUCCESS` | Program ran successfully (portable) |
| `EXIT_FAILURE` | Program did not run successfully (portable) |
| Non-zero (other) | Failure (not guaranteed portable) |

## DRY Principle

• **DRY**: "Don't Repeat Yourself" — eliminate code redundancy by extracting repeated logic into reusable functions

```cpp
// WET (bad): duplicates input logic
int x{};  std::cout << "Enter an integer: "; std::cin >> x;
int y{};  std::cout << "Enter an integer: "; std::cin >> y;

// DRY (good): reuse getValueFromUser()
int x{ getValueFromUser() };
int y{ getValueFromUser() };
```

## Key Gotchas

- Return value is **not printed** unless explicitly sent to `std::cout` or used
- A second `return` after the first is **unreachable code** — the function exits on the first `return`
- Nested function definitions are **not allowed** in C++
- Function names must follow identifier rules — `return 5()` is invalid

## Best Practices

- Always return a value from non-`void` functions in all code paths
- Return `0` (or `EXIT_SUCCESS`) from `main()` on success
- Document what a function's return value means with a comment
- Store a return value in a variable if it is needed more than once

---

# 2.3 — Void Functions (Non-Value Returning Functions)

## Void Return Type

• **void function**: a function that does not return a value to the caller
• **non-value returning function**: synonym for void function

```cpp
#include <iostream>

void printHi()          // void = no value returned
{
    std::cout << "Hi" << '\n';
    // no return statement needed
}

int main()
{
    printHi();          // valid: called for behavior, not return value
    return 0;
}
```

## Return Statements in Void Functions

- A void function automatically returns to the caller at the closing `}`.
- An empty `return;` is legal but redundant at the end of a void function.
- **Best practice**: do not put a `return;` at the end of a void function.

```cpp
void printHi()
{
    std::cout << "Hi" << '\n';
    return;  // redundant — remove this
}            // control returns here anyway
```

An early `return;` mid-function is valid and non-redundant:

```cpp
void printIfPositive(int x)
{
    if (x <= 0)
        return;             // early exit — NOT redundant
    std::cout << x << '\n';
}
```

## Where Void Functions Can and Cannot Be Used

```
┌─────────────────────────────────┬─────────────────┬────────────────────┐
│ Context                         │ void function   │ value-returning fn │
├─────────────────────────────────┼─────────────────┼────────────────────┤
│ Statement by itself             │ ✓ ok            │ ✓ ok (val ignored) │
│ Expression requiring a value    │ ✗ compile error │ ✓ ok               │
└─────────────────────────────────┴─────────────────┴────────────────────┘
```

```cpp
#include <iostream>

void returnNothing() {}
int  returnFive()    { return 5; }

int main()
{
    returnNothing();              // ok: no value required
    returnFive();                 // ok: return value ignored

    std::cout << returnFive();    // ok: value provided to cout
    std::cout << returnNothing(); // compile error: void has no value
    return 0;
}
```

## Returning a Value from a Void Function

Attempting to return a value from a `void` function is a **compile error**:

```cpp
void printHi()
{
    std::cout << "In printHi()\n";
    return 5;   // compile error: void function cannot return a value
}
```

## Summary of Rules

1. Declare `void` as the return type when a function produces no value.
2. Omit the `return` statement (or use bare `return;` for early exit only).
3. Never use a void function call in a value-requiring expression (e.g., `std::cout <<`, assignments, arguments).
4. Never return a value from a `void` function.

---

# 2.4 — Introduction to Function Parameters and Arguments

## Core Definitions

- **Function parameter**: A variable declared in the function header, initialized by the caller at call time
- **Argument**: A value passed *from* the caller *to* the function at the call site
- **Pass by value**: The mechanism by which argument values are copied into parameters via copy initialization
- **Value parameter**: A function parameter that uses pass by value
- **Unreferenced parameter**: A parameter that exists in the function signature but is not used in the function body
- **Unnamed parameter**: A parameter with no name, used to suppress compiler warnings about unreferenced parameters

---

## Parameter Syntax

Parameters are declared inside the parentheses of the function header, separated by commas.

```cpp
void doPrint()                     // no parameters
void printValue(int x)             // one parameter
int add(int x, int y)              // two parameters
```

Arguments at the call site must match the number and compatible types of parameters:

```cpp
doPrint();             // no arguments
printValue(6);         // one argument
add(2, 3);             // two arguments
```

---

## How Pass by Value Works

```
Caller                        Function
┌─────────────────┐           ┌──────────────────────┐
│ add(4, 5)       │  copy 4 ▶ │ int x  initialized=4 │
│                 │  copy 5 ▶ │ int y  initialized=5 │
│                 │ ◀ return  │ return x + y  → 9    │
└─────────────────┘           └──────────────────────┘
```

Each parameter is a **separate variable**; modifying a parameter does not affect the original argument.

---

## Parameters and Return Values Together

```cpp
#include <iostream>

int add(int x, int y)
{
    return x + y;
}

int main()
{
    std::cout << add(4, 5) << '\n'; // prints 9
    return 0;
}
```

---

## Arguments Can Be Expressions or Nested Calls

```cpp
add(1 + 2, 3 * 4)           // args evaluated first → add(3, 12) → 15
add(1, multiply(2, 3))       // inner call first     → add(1, 6)  → 7
add(1, add(2, 3))            // inner call first     → add(1, 5)  → 6
```

**Rule**: Arguments are fully evaluated before being passed to the function.

---

## Using a Return Value Directly as an Argument

```cpp
// Explicit intermediate variable
int num { getValueFromUser() };
printDouble(num);

// Direct — equivalent, more concise
printDouble(getValueFromUser());
```

---

## Unreferenced and Unnamed Parameters

```cpp
// Compiler warning: count defined but not used
void doSomething(int count)
{
}

// No warning: unnamed parameter
void doSomething(int)
{
}

// Recommended: comment documents the original name
void doSomething(int /*count*/)
{
}
```

**Why unreferenced parameters exist**: Removing a parameter would break all existing call sites; leaving it unnamed preserves the interface while suppressing the warning.

---

## Rules Summary

| Rule | Detail |
|------|--------|
| Argument count must match parameter count | Compiler error otherwise |
| Arguments are copied into parameters | Pass by value; originals unaffected |
| Arguments can be any valid expression | Including literals, variables, or function calls |
| Unused parameters should be unnamed | Optionally document name in a comment |

---

# Local Scope — Study Notes

## Local Variables

• **Local variable**: a variable defined inside the body of a function (includes function parameters)

```cpp
int add(int x, int y) // x and y are local variables (parameters)
{
    int z{ x + y };   // z is a local variable
    return z;
}
```

## Variable Lifetime

• **Lifetime**: the time between an object's creation and destruction (a runtime property)
• **Deallocated**: memory freed for reuse after an object is destroyed

### Creation
- Function parameters: created and initialized when the function is entered
- Local variables: created and initialized at the point of definition

### Destruction
- Local variables are destroyed in **reverse order of creation** at the end of the innermost curly braces containing them
- Function parameters are destroyed at the end of the function

```cpp
int add(int x, int y)  // x, y created here
{
    int z{ x + y };    // z created here
    return z;
} // z, y, x destroyed here (reverse order)
```

### Execution trace example
```
┌─────────────────────────────────────────────┐
│ main() starts                               │
│   a created → 5                             │
│   b created → 6                             │
│   add(5, 6) called                          │
│   ┌───────────────────────────────────────┐ │
│   │ add(): x created → 5, y created → 6  │ │
│   │ x + y = 11                            │ │
│   │ return 11                             │ │
│   │ y, x destroyed                        │ │
│   └───────────────────────────────────────┘ │
│   print 11                                  │
│   return 0                                  │
│   b, a destroyed                            │
└─────────────────────────────────────────────┘
```

## Scope

• **Scope**: determines where an identifier can be seen and used in source code (a compile-time property)
• **In scope**: identifier is visible and usable
• **Out of scope**: identifier is not visible; use causes a compile error
• **Local scope / block scope**: usable from point of definition to the end of the innermost enclosing curly braces

```
┌──────────────────────────────────────────────┐
│ main()                                       │
│   // x NOT in scope yet                      │
│   int x{ 0 };  ◀── x enters scope here       │
│   doSomething();  // x alive but not visible │
│   │              // inside doSomething()     │
│   return 0;                                  │
│ }  ◀── x goes out of scope here              │
└──────────────────────────────────────────────┘
```

### "Out of scope" vs "going out of scope"
- **Out of scope**: identifier cannot be accessed at a given location in code
- **Going out of scope**: object reaches the closing brace of the block where it was defined

## Functional Separation

Variables in different functions with the same name are **distinct** — scopes do not overlap.

```cpp
int add(int x, int y) { return x + y; } // add's x, y
int main()
{
    int x{ 5 };  // main's x — unrelated to add's x
    int y{ 6 };  // main's y — unrelated to add's y
    std::cout << add(x, y) << '\n';
}
```

> Names declared in a function are only visible within that function. Functions are independent of each other's variable names.

## Where to Define Local Variables

**Best practice**: define local variables as close to their first use as reasonable.

```cpp
// ✓ Preferred
int main()
{
    std::cout << "Enter an integer: ";
    int x{};        // defined just before use
    std::cin >> x;

    std::cout << "Enter another integer: ";
    int y{};        // defined just before use
    std::cin >> y;

    int sum{ x + y };
    std::cout << "The sum is: " << sum << '\n';
}
```

```cpp
// ✗ Avoid (C-style, all variables at top)
int main()
{
    int x{}, y{}, sum{}; // intended use unclear here
    // ... many lines before first use ...
}
```

## Function Parameters vs. Local Variables

| Situation | Use |
|---|---|
| Caller supplies the initialization value | Function parameter |
| Value is determined inside the function | Local variable |

```cpp
// ✗ Wrong: parameter used where local variable is appropriate
int getValueFromUser(int val)
{
    std::cin >> val;  // initial value of val is never used
    return val;
}

// ✓ Correct
int getValueFromUser()
{
    int val{};        // local variable
    std::cin >> val;
    return val;
}
```

## Temporary Objects

• **Temporary object** (anonymous object): an unnamed object created by the compiler to hold a value needed briefly
• Has **no scope** (scope is a property of identifiers; temporaries have no identifier)
• Destroyed at the end of the **full expression** in which they are created — always before the next statement

### Common case: return by value
```cpp
int main()
{
    std::cout << getValueFromUser() << '\n';
    //           ^^^^^^^^^^^^^^^^^ return value stored in a
    //           temporary object, passed to std::cout,
    //           then destroyed at end of this statement
}
```

> Return by value returns a temporary object holding a copy of the return value to the caller.

### Compiler optimizations (C++17+)
The compiler often **elides** (eliminates) temporaries:
- When a return value initializes a variable, the variable may be initialized directly
- When a return value is immediately used, the temporary creation/destruction may be skipped

---

## Why Functions Are Useful

## Benefits of Functions

| Benefit | Description |
|---|---|
| **Organization** | Breaks complex programs into smaller, manageable chunks |
| **Reusability** | Write once, call many times; avoids duplicated code (DRY principle) |
| **Testing** | Self-contained units can be tested independently and in isolation |
| **Extensibility** | Changes made in one place propagate everywhere the function is called |
| **Abstraction** | Callers only need to know name, inputs, and outputs — not implementation |

## Guidelines for Writing Functions

- Make a function when a group of statements appears **more than once** in a program.
- Make a function when code has a **well-defined set of inputs and outputs**, even if used only once.
- A function should perform **one and only one task**.
- Split long or complex functions into sub-functions — this is called **refactoring**.

• **Refactoring**: the process of restructuring existing code by splitting complicated functions into smaller sub-functions.

## Typical 3-Subtask Structure

Most beginner programs involve three subtasks:

```
┌─────────────────────┐
│  1. Read user input │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  2. Calculate value │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  3. Print result    │
└─────────────────────┘
```

Each subtask is a good candidate for its own function in non-trivial programs.

## Common Mistake: Mixing Calculation and Output

**Wrong** — one function calculates and prints (violates single-task rule):
```cpp
void calculateAndPrint(int x, int y)
{
    int result = x + y;
    std::cout << result << '\n'; // printing mixed with calculating
}
```

**Correct** — separate calculation from output; let the caller decide what to do with the value:
```cpp
int calculate(int x, int y)
{
    return x + y; // only calculates
}

void printResult(int result)
{
    std::cout << result << '\n'; // only prints
}

int main()
{
    int result { calculate(3, 4) };
    printResult(result);
    return 0;
}
```

---

# Forward Declarations and Definitions

## The Compilation Order Problem

The compiler processes code files sequentially. A function called before it is defined causes a compile error:

```cpp
#include <iostream>

int main()
{
    std::cout << add(3, 4) << '\n'; // error: 'add' not yet known
    return 0;
}

int add(int x, int y) { return x + y; } // defined too late
```

**Fix 1 — Reorder definitions:** Place `add` before `main`. Not always possible (e.g., mutually recursive functions A↔B).

**Fix 2 — Forward declaration (preferred for larger programs).**

---

## Forward Declarations

• **Forward declaration**: tells the compiler an identifier exists before its definition appears
• **Function declaration (function prototype)**: the syntax used to forward-declare a function

### Syntax

```
return_type name(param_types);   // semicolon required; no body
```

```cpp
int add(int x, int y);   // preferred: include parameter names
int add(int, int);        // valid: parameter names are optional
```

### Example

```cpp
#include <iostream>

int add(int x, int y);   // forward declaration

int main()
{
    std::cout << add(3, 4) << '\n';  // compiler knows add's signature
    return 0;
}

int add(int x, int y)    // definition can appear after use
{
    return x + y;
}
```

### What Happens Without a Definition

| Situation | Result |
|---|---|
| Declared, never called | Compiles and links fine |
| Declared, called, **no definition** | Compiles; **linker error** (`unresolved external symbol`) |

---

## Declarations vs. Definitions

```
┌─────────────────────────────────────────────────────┐
│                   Declarations                      │
│  ┌───────────────────────────────────────────────┐  │
│  │              Definitions                      │  │
│  │  (implement functions / instantiate variables)│  │
│  └───────────────────────────────────────────────┘  │
│   ▲ Pure declarations (forward decls) live here     │
└─────────────────────────────────────────────────────┘
```

| Term | Meaning | Example |
|---|---|---|
| **Declaration** | Tells compiler about identifier + type | `int add(int, int);` |
| **Definition** | Implements / instantiates; also a declaration | `int add(int x, int y) { … }` |
| **Pure declaration** | Declaration that is not a definition | `int add(int, int);` |
| **Initialization** | Provides initial value for a defined object | `int x { 2 };` |

> `int x;` is simultaneously a **definition** and a **declaration**.

---

## The One Definition Rule (ODR)

**Part 1 — Within a file/scope:** each function, variable, type, or template may have only one definition per scope.

**Part 2 — Within a program:** each function or variable may have only one definition across all files (linker-visible identifiers).

**Part 3 — Cross-file exemption:** types, templates, inline functions, and inline variables may have duplicate definitions in different files *only if* each definition is identical.

### ODR Violations

```cpp
int add(int x, int y) { return x + y; }
int add(int x, int y) { return x + y; } // ODR part 1 violation → compiler error

int main()
{
    int x{};
    int x{ 5 }; // ODR part 1 violation → compiler error
}
```

- Violating Part 1 → **compiler** redefinition error
- Violating Part 2 → **linker** redefinition error
- Violating Part 3 → **undefined behavior**

> Definitions in **different scopes** (e.g., `main::x` vs `add::x`) do not violate the ODR — they are distinct objects.

---

## Best Practices

- Fix the **first** listed compiler error, then recompile.
- Always include **parameter names** in function declarations.
- Copy the function header and append `;` to create a declaration quickly.

---

# Programs with Multiple Code Files

## Why Multiple Files

- Large programs are split across files for organization and reusability.
- Each `.cpp` file is compiled **independently** — the compiler has no knowledge of other files.
- File compilation order does not matter by design.

**Reasons for per-file isolation:**
1. Source files can compile in any order.
2. Only changed files need recompilation.
3. Reduces naming conflicts between files.

---

## Adding Files to a Project

• **Best practice**: give new code files a `.cpp` extension.

| Toolchain | How to add a file |
|---|---|
| Visual Studio | Right-click *Source Files* → *Add > New Item* → C++ File (.cpp) |
| Code::Blocks | *File > New > File* → C/C++ source → select C++ → name it → click *All* |
| gcc (CLI) | Create file manually; add to compile command: `g++ main.cpp add.cpp -o main` |
| VS Code | *View > Explorer* → New File icon; update `tasks.json` (see below) |

**VS Code `tasks.json` options** — replace `"${file}",` with either:
```
"main.cpp",
"add.cpp",
```
or (auto-compile all `.cpp` files):
- Windows: `"${fileDirname}\\**.cpp"`
- Unix: `"${fileDirname}/**.cpp"`

---

## Multi-File Compilation Problem

```
┌─────────────────┐     compiled     ┌──────────────────────────┐
│    add.cpp      │ ───────────────▶ │  object file: add.o      │
│                 │                  └──────────────────────────┘
│ int add(int,int)│                            │
│ { return x+y; } │                            │ linker
└─────────────────┘                            │
                                               ▼
┌─────────────────┐     compiled     ┌──────────────────────────┐
│    main.cpp     │ ───────────────▶ │  object file: main.o     │
│                 │   (compiler has  └──────────────────────────┘
│ add(3, 4); ◀───┼── no knowledge         │
│                 │    of add.cpp)         ▼
└─────────────────┘               ┌──────────────────┐
                                  │  final executable │
                                  └──────────────────┘
```

**Without a forward declaration**, `main.cpp` produces:
```
main.cpp(5) : error C3861: 'add': identifier not found
```

---

## Solution: Forward Declaration

**add.cpp** — unchanged:
```cpp
int add(int x, int y)
{
    return x + y;
}
```

**main.cpp** — add forward declaration:
```cpp
#include <iostream>

int add(int x, int y); // forward declaration: tells compiler add() exists elsewhere

int main()
{
    std::cout << "The sum of 3 and 4 is: " << add(3, 4) << '\n';
    return 0;
}
```

The **compiler** accepts `main.cpp` because of the forward declaration.
The **linker** connects the call in `main.o` to the definition in `add.o`.

---

## Identifier Resolution Rules

```
Identifier used in expression
        │
        ▼
No forward declaration AND no definition in this file?
        │ yes → compiler error at point of use
        │ no
        ▼
Definition in same file?
        │ yes → compiler connects use to definition
        │ no
        ▼
Definition in another file (visible to linker)?
        │ yes → linker connects use to definition
        │ no  → linker error: undefined reference
```

---

## `#include` Per File

Each file that uses standard library features must include the appropriate header independently.

```cpp
// add.cpp — needs its own #include if it uses std::cout
#include <iostream>

int add(int x, int y)
{
    std::cout << "adding\n"; // only valid because of the #include above
    return x + y;
}
```

---

## Common Errors and Fixes

| Error type | Symptom | Fix |
|---|---|---|
| Compiler error | `'add': identifier not found` | Add forward declaration in `main.cpp` |
| Linker error | `unresolved external symbol add` | Ensure `add.cpp` is added to the project/compile command |
| Linker error | same as above | Check file is not excluded from build in project settings |

> **Do not** `#include "add.cpp"` from `main.cpp`. This causes naming conflicts and other issues as projects grow.

---

# 2.9 — Naming Collisions and an Introduction to Namespaces

## Naming Collisions

• **Naming collision** (naming conflict): two identical identifiers introduced into a program in a way the compiler or linker cannot distinguish

| Collision location | Result |
|---|---|
| Same file | Compiler error |
| Separate files, same program | Linker error |

Common causes:
1. Identically named functions or global variables in separate files → linker error
2. Identically named functions or global variables in the same file → compiler error

---

## Scope Regions

• **Scope region**: an area of source code where all declared identifiers are distinct from names declared in other scopes

Rules:
- Two identical names in **separate** scope regions → no conflict
- Two identical names in the **same** scope region → naming collision

---

## Namespaces

• **Namespace**: a scope region (namespace scope) used to declare or define names for disambiguation
• **Namespace scope**: the scope created by a namespace; names inside are isolated from other scopes

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ namespace math              │  │ namespace physics           │
│  ┌─────────────────────┐   │  │  ┌─────────────────────┐   │
│  │ double distance() {} │   │  │  │ double distance() {} │   │
│  └─────────────────────┘   │  │  └─────────────────────┘   │
└─────────────────────────────┘  └─────────────────────────────┘
         no collision — names live in separate scopes
```

Namespaces may only contain **declarations** and **definitions**; executable statements are only allowed as part of a definition (e.g. inside a function body).

---

## The Global Namespace

• **Global namespace**: the implicitly defined namespace containing any name not declared inside a class, function, or explicit namespace

Rules:
- Identifiers declared in global scope are in scope from point of declaration to end of file
- Variables *can* be defined in global namespace but should generally be avoided

```cpp
#include <iostream>      // imports std::cout into global scope

void foo();              // OK: forward declaration
int x;                   // compiles, but discouraged: non-const global variable
int y { 5 };             // compiles, but discouraged: non-const global variable
x = 5;                   // compile error: executable statement in namespace scope

int main()               // OK: function definition
{
    return 0;
}
```

---

## The `std` Namespace

All C++ standard library identifiers live in the `std` namespace.

- `std::cout` — the actual name is `cout`; `std` is its namespace
- Using the namespace prefix avoids collisions with user-defined identifiers

---

## Accessing Namespace Identifiers

### Explicit Namespace Qualifier (Recommended)

• **Scope resolution operator** (`::`) : identifies which namespace a name belongs to; left side = namespace, right side = identifier; omitting the left side assumes global namespace

• **Qualified name**: an identifier that includes a namespace prefix

```cpp
#include <iostream>

int main()
{
    std::cout << "Hello world!";  // explicitly references cout in std namespace
    return 0;
}
```

### Using Directives (Avoid)

• **Using directive**: a statement (`using namespace X;`) that allows access to all names in namespace `X` without a prefix

```cpp
#include <iostream>
using namespace std;   // bad practice

int cout()             // user-defined cout
{
    return 5;
}

int main()
{
    cout << "Hello!";  // compile error: ambiguous — std::cout or user cout?
    return 0;
}
```

**Why to avoid `using namespace std;`:**
- Any user-defined identifier can silently collide with a `std` identifier
- Future standard library additions may introduce new collisions
- Defeats the purpose of namespaces

> ⚠️ **Avoid** using-directives at the top of files or in header files.

---

## Curly Braces and Nested Scope

Curly braces delineate a nested scope region inside an outer scope.

```
Global scope
├── #include <iostream>
├── void foo(int x)           ← foo declared in global scope
│   └── { ... }               ← body is nested scope of foo
└── int main()                ← main declared in global scope
    └── { ... }               ← body is nested scope of main
```

- Code inside nested scope is indented one level by convention
- Function parameters belong to the function's scope even though written outside the braces

```cpp
void foo(int x)          // x belongs to foo's scope
{
    std::cout << x << '\n';
}   // x goes out of scope here

int main()
{
    int x { 6 };         // x belongs to main's scope
    std::cout << x << '\n';
}   // x goes out of scope here
```

---

# 2.10 — Introduction to the Preprocessor

## Overview

- • **Preprocessing**: a phase that runs before compilation, making text transformations to each `.cpp` file
- • **Preprocessor**: the program that performs preprocessing
- • **Translation unit**: the output of preprocessing; what the compiler actually compiles
- • **Translation**: the full pipeline of preprocessing → compiling → linking

```
┌─────────────┐    preprocessor    ┌──────────────────┐    compiler    ┌──────────┐
│  .cpp file  │ ─────────────────▶ │ translation unit │ ─────────────▶ │  object  │
└─────────────┘                    └──────────────────┘                └──────────┘
```

## Preprocessor Directives

- • **Preprocessor directive**: an instruction beginning with `#`, ending with a newline (no semicolon)
- The preprocessor scans top-to-bottom, replacing directives with their output
- The preprocessor does **not** understand C++ syntax
- No directives appear in the final output passed to the compiler
- `using` directives are **not** preprocessor directives

## `#include`

Replaces the directive with the full contents of the named file, then preprocesses those contents recursively.

```cpp
#include <iostream>   // replaced with contents of iostream header
```

Each translation unit = one `.cpp` file + all recursively `#include`d headers.

## Macros (`#define`)

- • **Macro**: a rule mapping input text to replacement output text

### Two Forms

```cpp
#define IDENTIFIER                  // object-like, no substitution text
#define IDENTIFIER substitution_text // object-like, with substitution text
```

- Macro names: all uppercase, words separated by underscores (convention)
- Neither form ends with a semicolon

### Object-Like Macros With Substitution Text

Every occurrence of `IDENTIFIER` in normal code is replaced with `substitution_text`.

```cpp
#define MY_NAME "Alex"

std::cout << MY_NAME;  // preprocessor rewrites to: std::cout << "Alex";
```

- Legacy practice from C; prefer typed constants in modern C++
- **Avoid** macros with substitution text unless no viable alternative exists

### Object-Like Macros Without Substitution Text

```cpp
#define USE_YEN   // identifier defined; replaced with nothing in code
```

- Primary use: conditional compilation checks, not text substitution

## Conditional Compilation

### `#ifdef` / `#ifndef` / `#endif`

```
#ifdef  IDENTIFIER  → compiles block if IDENTIFIER has been #defined
#ifndef IDENTIFIER  → compiles block if IDENTIFIER has NOT been #defined
#endif              → closes the conditional block
```

```cpp
#define PRINT_JOE

#ifdef PRINT_JOE
    std::cout << "Joe\n";   // compiled — PRINT_JOE is defined
#endif

#ifdef PRINT_BOB
    std::cout << "Bob\n";   // excluded — PRINT_BOB is not defined
#endif
```

Equivalent longer forms:

```cpp
#if defined(PRINT_BOB)
#if !defined(PRINT_BOB)
```

### `#if 0` — Excluding Code Blocks

```cpp
#if 0          // block is never compiled
    std::cout << "Bob\n";
    /* multi-line
       comment OK here */
    std::cout << "Steve\n";
#endif
```

- Change to `#if 1` to re-enable the block
- Preferred over multi-line comments for disabling code (comments are non-nestable)

## Macro Substitution Rules

### Inside Other Preprocessor Commands

Macro substitution generally does **not** occur when a macro identifier appears inside another preprocessor directive.

```cpp
#define FOO 9

#ifdef FOO          // FOO is NOT replaced with 9 here
    std::cout << FOO << '\n';  // FOO IS replaced with 9 here
#endif
```

Exception: most forms of `#if` and `#elif` do perform macro substitution.

## Scope of `#define`

```
┌──────────────────────────────────────────────────────┐
│  Directives are processed top-to-bottom, per file    │
│  #define is valid from point of definition           │
│  to end of that file only                            │
│  (unless #included into another file)                │
└──────────────────────────────────────────────────────┘
```

- `#define` inside a function body behaves identically to one at file scope — the preprocessor ignores C++ scoping
- Directives from an `#include`d file are copied in and processed in order
- After preprocessing completes, all defined identifiers are discarded; they do **not** affect other translation units

```cpp
// main.cpp
#define PRINT         // only visible within main.cpp's translation unit

// function.cpp
#ifdef PRINT          // PRINT is not defined here — different translation unit
    std::cout << "Printing!\n";
#endif
// output: "Not printing!"
```

---

# Header Files

## What Are Header Files

• **Header file**: a file (typically `.h` extension) that propagates forward declarations into code files
• **Transitive includes**: headers included implicitly because another included header pulls them in

Header files solve the scaling problem of manually writing forward declarations across many files.

## Structure of a Header File

Two parts:
1. A header guard (covered in lesson 2.12)
2. Forward declarations for identifiers other files need to see

```cpp
// add.h
int add(int x, int y); // forward declaration — note the semicolon
```

## How `#include` Works

The preprocessor replaces `#include` with the full text of the named file at the point of inclusion.

```
┌─────────────┐    preprocessor    ┌──────────────────────┐
│  #include   │ ───────────────▶  │ contents of add.h    │
│  "add.h"    │                   │ inserted here        │
└─────────────┘                   └──────────────────────┘
```

## Angled Brackets vs Double Quotes

```
#include <iostream>   ← compiler/OS/third-party headers (search include directories only)
#include "add.h"      ← your own headers (search current directory first, then include directories)
```

**Rule**: use double quotes for headers you wrote; use angled brackets for everything else.

## Multi-File Example

```
┌──────────┐   #include "add.h"   ┌───────────┐   #include "add.h"
│ main.cpp │ ───────────────────▶ │  add.h    │ ◀─────────────────── add.cpp
│          │                      │           │                       │
│ uses     │   forward decl.      │ int add(  │   definition of       │
│ add()    │ ◀──────────────────  │  int,int);│   add() lives here    │
└──────────┘                      └───────────┘                       └──────────┘
```

**add.h**
```cpp
int add(int x, int y);
```

**add.cpp**
```cpp
#include "add.h"  // include paired header

int add(int x, int y)
{
    return x + y;
}
```

**main.cpp**
```cpp
#include "add.h"
#include <iostream>

int main()
{
    std::cout << "The sum of 3 and 4 is " << add(3, 4) << '\n';
    return 0;
}
```

## ODR Violation from Definitions in Headers

Putting a function **definition** in a header included by multiple `.cpp` files causes a linker error:

```
add.h defines add()
    ├── main.cpp includes add.h  →  definition #1 of add()
    └── add.cpp  includes add.h  →  definition #2 of add()
                                    ▲
                                    Linker sees two definitions — ODR violation
```

**Rule**: do not put function or variable definitions in header files (exceptions: inline functions, inline variables, types, templates — covered later).

## Why Source Files Should Include Their Paired Header

Including the paired header lets the compiler catch declaration/definition mismatches at compile time rather than link time:

```cpp
// add.h
int add(int x, int y);         // declares int return

// add.cpp
#include "add.h"               // compiler sees the mismatch immediately
double add(int x, int y) { … } // ← compiler error: return type conflict
```

Without `#include "add.h"` in `add.cpp`, this error surfaces only at link time.

## Standard Library Header Naming

| Type | Convention | Example | Namespace |
|---|---|---|---|
| C++ (new) | `<xxx>` | `<iostream>` | `std` |
| C compat (new) | `<cxxx>` | `<cstddef>` | `std` (required) |
| C++ (old) | `<xxx.h>` | `<iostream.h>` | global |
| C compat (old) | `<xxx.h>` | `<stddef.h>` | global |

**Rule**: use `<iostream>`, not `<iostream.h>`; old headers predate the `std` namespace.

## Including Headers from Other Directories

Prefer setting the compiler's include path over hardcoding relative paths:

```cpp
// Bad — embeds directory structure in source
#include "../utils/myHeader.h"
```

```
# Good — set include path at build time (gcc example)
g++ -o main -I./source/includes main.cpp
```

IDE equivalents: Visual Studio → *VC++ Directories → Include Directories*; Code::Blocks → *Build Options → Search directories*.

## Transitive Includes

**Rule**: do not rely on headers included transitively; explicitly `#include` every header your file needs.

```cpp
// Even if <iostream> happens to pull in <string>, write:
#include <iostream>
#include <string>  // explicit — don't rely on transitive inclusion
```

## `#include` Order (Best Practice)

```
1. Paired header for this file   ("add.h")
2. Other project headers          ("mymath.h")
3. Third-party library headers    (<boost/tuple/tuple.hpp>)
4. Standard library headers       (<iostream>)
```
Each group sorted alphabetically. This order maximizes the chance that missing includes surface as compile errors.

## Summary of Rules

| Rule | Detail |
|---|---|
| Use `.h` suffix | for user-defined headers |
| Match base names | `add.h` pairs with `add.cpp` |
| No definitions in headers | prevents ODR violations |
| Include paired header in `.cpp` | catches mismatches at compile time |
| Never `#include` `.cpp` files | causes ODR issues and naming collisions |
| Always use header guards | covered in lesson 2.12 |
| Explicit includes only | do not rely on transitive includes |

---

# 2.12 — Header Guards

## The Duplicate Definition Problem

The one definition rule forbids multiple definitions of the same identifier in a translation unit.

Including a header file multiple times (directly or via another header) causes duplicate definitions:

```
main.cpp includes square.h directly
main.cpp includes wave.h, which also includes square.h
```

```
┌─────────────────────────────────────┐
│ main.cpp (after preprocessing)      │
├─────────────────────────────────────┤
│ int getSquareSides() { return 4; }  │ ◀ from square.h
│ int getSquareSides() { return 4; }  │ ◀ from wave.h → square.h
│ int main() { return 0; }            │
└─────────────────────────────────────┘
         ▼ compile error: duplicate definition
```

## Header Guards

• **Header guard**: conditional compilation directives that prevent a header's contents from being included more than once per translation unit.
• **Include guard**: alternate name for header guard.

### Syntax

```cpp
#ifndef SOME_UNIQUE_NAME_HERE
#define SOME_UNIQUE_NAME_HERE

// declarations and definitions here

#endif
```

**How it works:**
1. First inclusion: `SOME_UNIQUE_NAME_HERE` is not defined → content is included, macro is defined.
2. Subsequent inclusions: `SOME_UNIQUE_NAME_HERE` is already defined → content is skipped.

### Naming Convention

Use the header filename in ALL_CAPS with underscores replacing spaces/punctuation.

```cpp
// square.h
#ifndef SQUARE_H
#define SQUARE_H

int getSquareSides()
{
    return 4;
}

#endif
```

For large projects with potential name collisions, prefer: `PROJECT_PATH_FILE_H`.

## How Guards Resolve the Duplicate Inclusion Problem

```cpp
// After preprocessing main.cpp:

#ifndef SQUARE_H      // not yet defined → enter block
#define SQUARE_H      // now defined

int getSquareSides() { return 4; }

#endif

#ifndef WAVE_H        // not yet defined → enter block
#define WAVE_H

#ifndef SQUARE_H      // already defined → skip entire block
#define SQUARE_H
int getSquareSides() { return 4; }
#endif

#endif

int main() { return 0; }
```

## Header Guards Do NOT Prevent Inclusion Across Separate Files

Header guards only prevent multiple inclusions **within the same translation unit**.

```
┌─────────────┐     includes square.h     ┌──────────────┐
│  square.cpp │ ─────────────────────────▶│ getSquareSides│ definition
└─────────────┘                           └──────────────┘
┌─────────────┐     includes square.h     ┌──────────────┐
│  main.cpp   │ ─────────────────────────▶│ getSquareSides│ definition
└─────────────┘                           └──────────────┘
                                    ▼ linker error: multiple definitions
```

**Solution**: put function definitions in `.cpp` files; put only forward declarations in headers.

```cpp
// square.h — declarations only
#ifndef SQUARE_H
#define SQUARE_H

int getSquareSides();
int getSquarePerimeter(int sideLength);

#endif
```

```cpp
// square.cpp — definitions
#include "square.h"

int getSquareSides()               { return 4; }
int getSquarePerimeter(int side)   { return side * getSquareSides(); }
```

## `#pragma once`

An alternative, compiler-specific directive:

```cpp
#pragma once

// your code here
```

| Feature | Header Guards | `#pragma once` |
|---|---|---|
| Defined by C++ standard | Yes | No |
| Verbosity | More | Less |
| Error-prone | Slightly | Less |
| Handles duplicate files on disk | Yes | No |
| Compiler support | Universal | Nearly universal |

**Rule**: `#pragma once` is not part of the C++ standard; prefer traditional header guards for maximum portability.

## Key Rules

- Every header file should have header guards.
- Duplicate **declarations** are fine; duplicate **definitions** are not.
- Header guards prevent multiple inclusions within one translation unit, not across separate translation units.
- Do not define functions in headers (except where required, e.g., type definitions, templates).

---

# 2.13 — How to Design Your First Programs

## Core Principle

Design your program **before you start coding**. Planning up front saves debugging time later.

---

## Design Step 1: Define Your Goal

State the goal in one or two sentences as a user-facing outcome.

- "Model how long it takes for a ball dropped off a tower to hit the ground."
- "Generate randomized dungeons that produce interesting looking caverns."

---

## Design Step 2: Define Requirements

• **Requirements**: constraints the solution must abide by, plus capabilities the program must exhibit

Requirements focus on **what**, not **how**.

Examples:
- The user should be able to enter the height of the tower.
- The program should produce results within 10 seconds.
- The program should crash in less than 0.1% of user sessions.

A solution is not done until **all** requirements are satisfied.

---

## Design Step 3: Define Tools, Targets, and Backup Plan

For non-trivial projects, back up code to a **different physical location**:

```
Local only         → risk: hardware failure
Removable storage  → risk: theft, fire, disaster
Remote/cloud copy  → recommended minimum
Version control    → best: restore + rollback capability
```

Examples: email zip, cloud storage (Dropbox), SFTP, GitHub.

---

## Design Step 4: Break Hard Problems into Easy Problems

Two approaches:

### Top-Down
Start with the complex task; split into subtasks; repeat until each task is trivial.

```
Clean the house
├── Vacuum the carpets
├── Clean the bathrooms
│   ├── Scrub the toilet
│   └── Wash the sink
└── Clean the kitchen
    ├── Clear the countertops
    ├── Clean the countertops
    ├── Scrub the sink
    └── Take out the trash
```

### Bottom-Up
Start from a list of easy tasks; group similar items to form the hierarchy.

```
Get from bed to work
├── Bedroom things
│   ├── Turn off alarm
│   ├── Get out of bed
│   └── Pick out clothes
├── Bathroom things
│   ├── Take a shower
│   ├── Get dressed
│   └── Brush your teeth
├── Breakfast things
│   ├── Make coffee or tea
│   └── Eat cereal
└── Transportation things
    ├── Get on your bicycle
    └── Travel to work
```

### Mapping to Code

```
Task hierarchy        →  Program structure
──────────────────────────────────────────
Top-level task        →  main()
Subtasks              →  functions
Sub-subtasks          →  sub-functions
```

---

## Design Step 5: Figure Out the Sequence of Events

Determine the order in which tasks execute.

Calculator example sequence:
1. Get first number from user
2. Get mathematical operation from user
3. Get second number from user
4. Calculate result
5. Print result

---

## Implementation Step 1: Outline `main()`

Translate the sequence into commented-out function calls:

```cpp
int main()
{
    // Get first number from user
//    getUserInput();

    // Get mathematical operation from user
//    getMathematicalOperation();

    // Get second number from user
//    getUserInput();

    // Calculate result
//    calculateResult();

    // Print result
//    printResult();

    return 0;
}
```

- Comment out calls until the function definition exists, **or**
- **Stub** functions (empty body placeholders) so the program compiles.

---

## Implementation Step 2: Implement Each Function

For each function:
1. Define the prototype (inputs and outputs)
2. Write the function body
3. Test the function before moving on

```cpp
#include <iostream>

int getUserInput()
{
    std::cout << "Enter an integer: ";
    int input{};
    std::cin >> input;
    return input;
}

int main()
{
    // Get first number from user
    int value{ getUserInput() };
    std::cout << value << '\n'; // temporary debug output; remove after verification

    // Get mathematical operation from user
//    getMathematicalOperation();

    // Get second number from user
//    getUserInput();

    // Calculate result
//    calculateResult();

    // Print result
//    printResult();

    return 0;
}
```

- Verify each function works correctly before implementing the next.
- Remove temporary debug output once verified.

---

## Implementation Step 3: Final Testing

Test the completed program as a whole; fix any remaining issues.

---

## Programming Best Practices

| Practice | Rationale |
|---|---|
| Keep programs simple to start | Complexity overwhelms; build from a working base |
| Add features incrementally | Each addition stays manageable |
| Focus on one area at a time | Split attention causes mistakes and missed details |
| Test each piece as you go | Isolates bugs to recently written code |
| Don't over-polish early code | Code changes invalidate premature polish |
| Optimize for maintainability, not performance | Premature optimization wastes effort; structure matters more |

• **Premature optimization**: investing in micro-optimizations before knowing where performance is actually needed — avoid it

---

## Key Insight

Spending a little time up front thinking about program structure leads to better code and less time spent finding and fixing errors.

---

# Chapter 2 Summary — Functions, Files, and the Preprocessor

## Functions

- **Function**: A reusable sequence of statements designed to do a particular job
- **User-defined function**: A function written by the programmer
- **Function call**: An expression that tells the CPU to execute a function
- **Caller**: The function initiating a function call
- **Callee**: The function being called
- **Function body**: The curly braces and statements in a function definition

## Return Values

- **Value-returning function**: A function that returns a value to the caller
- **Return type**: Indicates the type of value a function will return
- **Return statement**: Determines the specific value returned to the caller
- **Return by value**: The process of copying a return value back to the caller
- **Status code**: The return value from `main`; `0` = success, non-zero = failure
- Failure to return a value from a non-`void` function causes **undefined behavior**

## Void Functions

- **Void function**: A function with return type `void`; returns no value to the caller
- Void functions cannot be called where a value is required
- **Early return**: A return statement that is not the last statement in a function; causes immediate return to caller

## Parameters and Arguments

- **Function parameter**: A variable in a function whose value is provided by the caller
- **Argument**: The specific value passed from caller to function
- **Pass by value**: When an argument is copied into a parameter

## Scope and Lifetime

- **Local variable**: A parameter or variable defined inside a function body
- **Lifetime**: The time period in which a variable exists (a runtime property)
- **Runtime**: When the program is running; variables are created and destroyed here
- **Scope**: Determines where a variable can be seen and used (a compile-time property)
- **In scope**: A variable that can currently be seen and used
- **Out of scope**: A variable that cannot currently be seen or used

```
┌─────────────────────────────────┐
│ Scope = compile-time property   │
│ Lifetime = runtime property     │
└─────────────────────────────────┘
```

## Forward Declarations and Definitions

- **Forward declaration**: Tells the compiler about an identifier before it is defined
- **Function prototype**: The syntax for a forward declaration — return type, name, parameters, semicolon; no body
- **Definition**: Actually implements (functions/types) or instantiates (variables) an identifier
- **Declaration**: Tells the compiler an identifier exists
- **Pure declaration**: A declaration that is not also a definition (e.g., function prototypes)
- All definitions are also declarations; not all declarations are definitions

```cpp
int readNumber();        // pure declaration (function prototype)
int readNumber() { }    // definition (also a declaration)
```

## Multiple Files and Namespaces

- **Naming collision**: Two identifiers the compiler/linker cannot distinguish → error
- **Namespace**: Guarantees all identifiers within it are unique
- **Whitespace**: Spaces, tabs, and newlines; used for formatting

## The Preprocessor and Headers

- **Preprocessor**: Runs on code before compilation
- **Directive**: Special instruction to the preprocessor; starts with `#`, ends at newline
- **Macro**: A rule that converts input text to replacement output text
- **Header file**: A file designed to propagate declarations to code files
- **Header guard**: Prevents a header's contents from being included more than once into a single code file

```cpp
#ifndef IO_H
#define IO_H

int readNumber();
void writeAnswer(int x);

#endif
```

### Include Rules

| Source | Syntax |
|---|---|
| Standard library headers | `#include <iostream>` |
| User-defined headers | `#include "io.h"` |
| Prefer no `.h` extension for C++ standard headers | `<cmath>` not `<math.h>` |

## DRY Principle

- **DRY**: "Don't Repeat Yourself" — use variables and functions to eliminate redundant code

## Multi-File Program Structure

```
┌──────────┐     includes     ┌──────────┐
│ main.cpp │ ──────────────▶  │  io.h    │
└──────────┘                  └──────────┘
                                    ▲
┌──────────┐     includes           │
│  io.cpp  │ ───────────────────────┘
└──────────┘
```

- `io.h` — header guards + forward declarations
- `io.cpp` — includes `io.h` + function definitions
- `main.cpp` — includes `io.h` + calls functions
- All `.cpp` files must be compiled into the project; missing files cause linker errors such as `undefined reference to 'readNumber()'`