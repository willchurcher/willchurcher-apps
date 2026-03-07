# Chapter 3 — Notes


---

# 3.1 — Syntax and Semantic Errors

## Error Categories

```
┌─────────────────────────────────────────────────────┐
│                    Program Errors                   │
├──────────────────────┬──────────────────────────────┤
│   Syntax Errors      │      Semantic Errors         │
│  (caught by compiler)│  (compile-time or runtime)   │
└──────────────────────┴──────────────────────────────┘
```

## Syntax Errors

• **Syntax error**: a statement that violates the grammar rules of C++

The compiler detects syntax errors and issues warnings or errors at compile time.

Common causes:
- Missing semicolons
- Mismatched parentheses or braces
- Invalid variable names
- Non-existent operators

```cpp
#include <iostream>

int main(          // missing closing parenthesis
{
    int 1x;        // variable name can't start with a number
    std::cout << "Hi there"; << x +++ << '\n'; // extraneous semicolon; +++ doesn't exist
    return 0       // missing semicolon
}
```

## Semantic Errors

• **Semantic error**: a statement is syntactically valid but has incorrect meaning — either violates language rules or does not do what the programmer intended

### Compile-Time Semantic Errors

Caught by the compiler before the program runs.

```cpp
int main()
{
    5 = x;         // x undeclared; cannot assign to a literal
    return "hello"; // "hello" cannot convert to int
}
```

### Runtime Semantic Errors

Only manifest during program execution; the compiler cannot catch these.

**Crash-causing example — division by zero:**
```cpp
#include <iostream>

int main()
{
    int a { 10 };
    int b { 0 };
    std::cout << a << " / " << b << " = " << a / b << '\n'; // undefined behavior
    return 0;
}
```

**Wrong output — uninitialized variable:**
```cpp
#include <iostream>

int main()
{
    int x;               // no initializer
    std::cout << x << '\n'; // undefined result
    return 0;
}
```

**Wrong output — incorrect operator:**
```cpp
#include <iostream>

int add(int x, int y)   // intended to add
{
    return x - y;       // subtracts instead; produces wrong result
}

int main()
{
    std::cout << "5 + 3 = " << add(5, 3) << '\n'; // prints 2, not 8
    return 0;
}
```

**Dead code — unreachable statement:**
```cpp
#include <iostream>

int main()
{
    return 0;                          // function exits here
    std::cout << "Hello, world!\n";    // never executes
}
```

## Summary

```
┌──────────────┬───────────────────┬──────────────────────────────┐
│ Error Type   │ Detected By       │ Example                      │
├──────────────┼───────────────────┼──────────────────────────────┤
│ Syntax       │ Compiler          │ Missing semicolon            │
│ Semantic     │ Compiler          │ Undeclared variable          │
│ (compile)    │                   │ Type mismatch                │
│ Semantic     │ Runtime behavior  │ Division by zero             │
│ (runtime)    │                   │ Wrong operator, uninit var   │
└──────────────┴───────────────────┴──────────────────────────────┘
```

---

## The Debugging Process

## The Six-Step Debugging Process

```
┌─────────────────────────────────────────────┐
│ 1. Find the root cause of the problem       │
│ 2. Understand why the issue is occurring    │
│ 3. Determine how to fix the issue           │
│ 4. Repair the issue                         │
│ 5. Retest — confirm the problem is fixed    │
│ 6. Retest — confirm no new problems emerged │
└─────────────────────────────────────────────┘
```

## Core Principle

• **Root cause**: the actual source of a bug, distinct from its symptoms; all bugs stem from something believed to be correct that is not.

Finding the root cause requires distinguishing symptoms (observable wrong behavior) from the underlying defect.

## Applying the Process — Example

```cpp
#include <iostream>

int add(int x, int y) // supposed to perform addition
{
    return x - y; // bug: wrong operator
}

int main()
{
    std::cout << "5 + 3 = " << add(5, 3) << '\n'; // prints 2, expected 8
    return 0;
}
```

```
Symptom:      add(5, 3) returns 2 instead of 8
              │
              ▼
Root cause:   return x - y  uses operator- instead of operator+
              │
              ▼
Fix:          change operator- to operator+
              │
              ▼
Retest:       output is now 8 ✓  no new issues ✓
```

### Step-by-Step Breakdown

| Step | Action |
|------|--------|
| Find root cause | Arguments `5` and `3` are correct literals; wrong output points to the function body; single `return` statement uses `-` not `+` |
| Understand | Wrong operator produces subtraction instead of addition |
| Determine fix | Replace `operator-` with `operator+` |
| Repair | Edit the source; recompile |
| Retest (fix) | Program now outputs `8` |
| Retest (regressions) | No other behavior changed |

## Key Notes

- A wrong output is a **symptom**; the line producing it is the **root cause**.
- Intermediate wrong values (e.g., an empty ice tray) are additional symptoms, not root causes — keep tracing back.
- Multiple fixes may exist; choose the most appropriate one given context.
- Both retest steps are required: verifying the fix and verifying no regressions.

---

# 3.3 — A Strategy for Debugging

## Core Approach

Finding a bug dominates debugging time; fixing it is usually trivial once located.

Two primary methods for locating bugs:
1. **Code inspection** — reading code to spot the error visually
2. **Runtime observation** — watching program behavior while it runs

---

## Finding Problems via Code Inspection

Effective for small programs or when the error clearly points to one function.

Limitations as programs grow:
- More lines to review
- More complex logic with more failure points
- Symptoms may give few directional clues
- **Bad assumptions** — you repeat the same faulty reasoning when reading the code, making the bug invisible

---

## Finding Problems by Running the Program

### General Process

```
1. Reproduce the problem consistently
2. Run program; gather information to narrow location
3. Repeat step 2 until problem is found
```

### Step 1: Reproduce the Problem

• **Reproduce the problem**: making the bug appear consistently on demand

Without reproducibility, diagnosis is nearly impossible.

• **Reproduction steps**: a clear, precise sequence of actions that cause the issue to recur with high predictability

| Reproducibility | Effect |
|---|---|
| 100% | Ideal — every run contributes diagnostic data |
| 50% | Acceptable — takes ~2× as long |
| 0% (can't reproduce) | Very difficult to diagnose |

---

### Step 2: Home In on the Issue

Use a **binary search / hi-lo strategy** to isolate location:

```
Full code execution path
├─────────────────────────────────────────────┤
│   region A   │   region B   │   region C   │
                              ▲
                        First observable
                        incorrect symptom
                        → bug is before here
```

**Two key observations that act as bounds:**

| Observation | Meaning |
|---|---|
| Proven no problem yet at point P | Bug is **after** P (analogous to "too low") |
| Incorrect behavior observed at point P | Bug is **before** P (analogous to "too high") |

### Example — Variable Has Wrong Value

```cpp
// Expected x == 2, but program prints x == 8

// If we confirm x == 8 HERE:
doSomething(x);    // ← bug must be before this line

// If we confirm x == 2 HERE:
doSomethingElse(); // ← bug must be after this line
```

Repeat until the location is isolated to a single line.

---

## Key Principle

> When all other locations have been eliminated, the remaining location must be the source of the bug.

Good guessing strategy depends on bug type — intuition improves with experience.

---

# 3.4 — Basic Debugging Tactics

## Tactic 1: Commenting Out Code

Isolate suspect code by commenting it out and observing whether the problem changes.

```cpp
int main()
{
    getNames();
//  doMaintenance(); // commented out to test
    sortNames();
    printNames();
    return 0;
}
```

Possible outcomes after commenting:

| Result | Interpretation |
|---|---|
| Problem disappears | Commented code is the cause |
| Problem unchanged | Commented code is not the cause; exclude it |
| Problem morphs | Commented code has side effects other code depends on; restore it |

**Warning**: Track every commented-out statement; failing to restore them introduces new bugs.

---

## Tactic 2: Validating Code Flow

Place `std::cerr` statements at the top of functions to verify which functions are actually called and in what order.

```cpp
#include <iostream>

int getValue()
{
std::cerr << "getValue() called\n";
    return 4;
}

int main()
{
std::cerr << "main() called\n";
    std::cout << getValue() << '\n';
    return 0;
}
```

Expected output:
```
main() called
getValue() called
4
```

If `getValue() called` never appears, the function is never being invoked — pointing to a call-site error.

---

## Tactic 3: Printing Values

Print variable and parameter values to verify data is correct at each stage.

```cpp
int main()
{
    int x{ getUserInput() };
std::cerr << "main::x = " << x << '\n';
    int y{ getUserInput() };
std::cerr << "main::y = " << y << '\n';

    int z{ add(x, y) };
std::cerr << "main::z = " << z << '\n';
    printResult(z);
    return 0;
}
```

Print function arguments on entry to verify what was passed:

```cpp
int add(int x, int y)
{
std::cerr << "add() called (x=" << x << ", y=" << y << ")\n";
    return x + y;
}
```

Narrowing strategy:
```
┌─────────────────────────────────────────────────────────┐
│  value correct here → ... → value wrong here            │
│                              ▲                          │
│                         bug lives in this gap           │
└─────────────────────────────────────────────────────────┘
```

---

## Key Rules

### Use `std::cerr`, Not `std::cout`
- • **`std::cout`**: buffered — output may not appear before a crash
- • **`std::cerr`**: unbuffered — output appears immediately; also signals error/diagnostic context

### Don't Indent Debug Statements
Leaving debug statements unindented makes them visually distinct and easy to find for removal.

To suppress `clang-format` auto-indenting:
```cpp
// clang-format off
std::cerr << "main() called\n";
// clang-format on
```

---

## Limitations of Print-Based Debugging

| Problem | Effect |
|---|---|
| Clutters source code | Harder to read |
| Clutters program output | Harder to interpret results |
| Requires code modification | Can introduce new bugs |
| Must be removed after use | Non-reusable; easy to forget |

---

# 3.5 — More Debugging Tactics

## Problems with Basic Debug Statements

1. Clutter source code
2. Clutter program output
3. Require manual add/remove (risk of new bugs)
4. Not reusable across sessions

---

## Conditionalizing Debug Code

Wrap debug statements in preprocessor conditionals controlled by a single `#define`.

```cpp
#include <iostream>

#define ENABLE_DEBUG // comment out to disable debugging

int getUserInput()
{
#ifdef ENABLE_DEBUG
    std::cerr << "getUserInput() called\n";
#endif
    std::cout << "Enter a number: ";
    int x{};
    std::cin >> x;
    return x;
}

int main()
{
#ifdef ENABLE_DEBUG
    std::cerr << "main() called\n";
#endif
    int x{ getUserInput() };
    std::cout << "You entered: " << x << '\n';
    return 0;
}
```

### How It Works

```
#define ENABLE_DEBUG present          #define ENABLE_DEBUG absent
┌──────────────────────────────┐      ┌──────────────────────────────┐
│ #ifdef ENABLE_DEBUG → true   │      │ #ifdef ENABLE_DEBUG → false  │
│ debug statements compiled in │      │ debug statements excluded     │
└──────────────────────────────┘      └──────────────────────────────┘
```

### Multi-file Projects
- Place `#define ENABLE_DEBUG` in a shared header included by all `.cpp` files
- Toggling one location propagates everywhere

### Drawbacks
- `#ifdef` blocks add significant visual clutter
- A typo in the macro name or a missing `#include` silently disables debugging in that file

---

## Using a Logger

• **Log**: a sequential, usually time-stamped record of events
• **Logging**: the process of generating a log
• **Log file**: a file on disk where log output is written

### Advantages Over Preprocessor Approach
- Debug output is separated from normal program output — no console clutter
- Log files can be sent to others for remote diagnosis
- No conditional compilation directives needed in source code

### `std::clog`
- Built-in C++ output stream intended for logging
- Writes to standard error by default (same destination as `std::cerr`)
- Redirecting it to a file is possible but awkward; third-party loggers are preferred

---

## Example: plog Logger

```cpp
#include <plog/Log.h>                              // Step 1: include headers
#include <plog/Initializers/RollingFileInitializer.h>
#include <iostream>

int getUserInput()
{
    PLOGD << "getUserInput() called";              // Step 3: log a message

    std::cout << "Enter a number: ";
    int x{};
    std::cin >> x;
    return x;
}

int main()
{
    plog::init(plog::debug, "Logfile.txt");        // Step 2: initialize logger

    PLOGD << "main() called";

    int x{ getUserInput() };
    std::cout << "You entered: " << x << '\n';
    return 0;
}
```

### Sample Log File Output (`Logfile.txt`)
```
2018-12-26 20:03:33.295 DEBUG [4752] [main@19] main() called
2018-12-26 20:03:33.296 DEBUG [4752] [getUserInput@7] getUserInput() called
```

### Disabling Logging Without Code Changes
```cpp
plog::init(plog::none, "Logfile.txt"); // suppresses most output
```

---

## Comparison

```
┌─────────────────────┬──────────────────────┬────────────────────────┐
│ Property            │ Preprocessor Guards  │ Logger                 │
├─────────────────────┼──────────────────────┼────────────────────────┤
│ Output separation   │ No (still stderr)    │ Yes (separate file)    │
│ Code clutter        │ High (#ifdef blocks) │ Low (one macro/call)   │
│ Toggle mechanism    │ Comment/uncomment    │ Change init parameter  │
│ Shareable output    │ No                   │ Yes (send log file)    │
│ Timestamps          │ No                   │ Yes                    │
└─────────────────────┴──────────────────────┴────────────────────────┘
```

---

# 3.6 — Using an Integrated Debugger: Stepping

## Key Definitions

- **Program state**: All information tracked during execution — variable values, call history, current execution point
- **Debugger**: A program that controls another program's execution and exposes its state at runtime
- **Integrated debugger**: A debugger embedded in the IDE, sharing the same interface as the code editor
- **Stepping**: A set of debugger features that execute code statement by statement

---

## Build Configuration Warning

Always compile under a **debug build configuration** before using the debugger.
A release build may cause step commands to run the program straight through instead of pausing.

---

## Stepping Commands

### Step Into
Executes the **next single statement**; if that statement is a function call, jumps to the **first line inside** that function.

```
Execution marker hits:  printValue(5);
▶ Steps into:           void printValue(int value) {
```

| IDE            | Menu                    | Shortcut    |
|----------------|-------------------------|-------------|
| Visual Studio  | Debug › Step Into       | F11         |
| Code::Blocks   | Debug › Step into       | Shift+F7    |
| VS Code        | Run › Step Into         | F11         |

### Step Over
Executes the **next statement**; if that statement is a function call, runs the **entire function without pausing** inside it, then returns control after the call.

```
Execution marker hits:  printValue(5);
▶ Steps over:           executes printValue() silently
▶ Returns control to:   return 0;
```

| IDE            | Menu                    | Shortcut    |
|----------------|-------------------------|-------------|
| Visual Studio  | Debug › Step Over       | F10         |
| Code::Blocks   | Debug › Next line       | F7          |
| VS Code        | Run › Step Over         | F10         |

Use step over when a function is known-good or not currently under investigation.

### Step Out
Executes **all remaining lines in the current function**, then returns control to the call site.

```
Inside:   printValue(int value)  ← execution marker here
▶ Step out executes remaining lines, outputs 5
▶ Returns control to:  printValue(5);  in main()
```

| IDE            | Menu                    | Shortcut    |
|----------------|-------------------------|-------------|
| Visual Studio  | Debug › Step Out        | Shift+F11   |
| Code::Blocks   | Debug › Step out        | Ctrl+F7     |
| VS Code        | Run › Step Out          | Shift+F11   |

Use step out when you have accidentally stepped into a function you do not need to debug.

---

## Execution Flow Diagram

```
main() {
│
├─▶ printValue(5);  ──── Step Over ──▶ skips body, resumes after call
│         │
│         └── Step Into ──▶ enters body
│                   │
│                   ├─▶ std::cout << value << '\n';
│                   │
│                   └── Step Out ──▶ finishes body, returns to call site
│
└─▶ return 0;
}
```

---

## Overstepping

- Stepping is **forward only** by default.
- If you step past the target location: **stop debugging and restart**, stepping more carefully.

### Step Back (Reverse Debugging)
- Rewinds the last step to a prior program state.
- Not universally supported; available in Visual Studio Enterprise and `rr`.
- Not available in Visual Studio Community or standard Code::Blocks.

---

## std::cout Buffering During Debugging

Output may not appear immediately due to buffering. Add this temporarily to `main()`:

```cpp
std::cout << std::unitbuf; // flush cout after every output (debug only)
```

Wrap in a conditional to avoid manual removal:

```cpp
#ifdef DEBUG
std::cout << std::unitbuf;
#endif
```

Remove or comment out after debugging to restore normal performance.

---

## Gotchas

- `operator<<` is implemented as a function; step into on a `std::cout` line may jump into standard library source. Use **step out** to escape.
- After a function returns, the execution marker may briefly point back at the call site — this indicates **return from function**, not a second call.
- Debugger keyboard shortcuts only work when the IDE/debugger window is **active**.

---

# 3.7 — Using an Integrated Debugger: Running and Breakpoints

## Run to Cursor

• **Run to cursor**: executes the program until reaching the selected statement, then returns control to the debugger

| IDE | Method |
|---|---|
| Visual Studio | Right-click → *Run to Cursor*, or `Ctrl+F10` |
| Code::Blocks | Right-click → *Run to cursor*, or `F4` |
| VS Code | Right-click → *Run to Cursor* (while debugging) |

- If the selected line is never reached, the program runs to termination instead.

## Continue

• **Continue**: resumes normal program execution from the current point until termination or the next interruption (e.g., breakpoint)

| IDE | Method |
|---|---|
| Visual Studio | *Debug → Continue*, or `F5` |
| Code::Blocks | *Debug → Start / Continue*, or `F8` |
| VS Code | *Run → Continue*, or `F5` |

## Start

• **Start**: same as *Continue* but begins from the program's entry point; only available when not already in a debug session

| IDE | Method |
|---|---|
| Visual Studio | *Debug → Start Debugging*, or `F5` |
| Code::Blocks | *Debug → Start / Continue*, or `F8` |
| VS Code | *Run → Start Debugging*, or `F5` |

## Breakpoints

• **Breakpoint**: a persistent marker that instructs the debugger to pause execution every time that line is reached

| IDE | Method |
|---|---|
| Visual Studio | `F9`, or click left of line number, or *Debug → Toggle Breakpoint* |
| Code::Blocks | `F5`, or click right of line number, or *Debug → Toggle breakpoint* |
| VS Code | `F9`, or click left of line number, or *Run → Toggle Breakpoint* |

### Breakpoints vs. Run to Cursor

```
┌─────────────────────────┬──────────────────────────┬───────────────────────┐
│ Feature                 │ Run to Cursor            │ Breakpoint            │
├─────────────────────────┼──────────────────────────┼───────────────────────┤
│ Triggers multiple times │ No — once per invocation │ Yes — every execution │
│ Persists between runs   │ No                       │ Yes, until removed    │
│ Requires re-selection   │ Yes                      │ No                    │
└─────────────────────────┴──────────────────────────┴───────────────────────┘
```

Example: with a breakpoint on line 5 and `printValue` called three times, execution halts three times:

```cpp
int main()
{
    printValue(5);  // halts here (1st)
    printValue(6);  // halts here (2nd)
    printValue(7);  // halts here (3rd)
    return 0;
}
```

- Breakpoints placed on lines not in the execution path never trigger.

## Set Next Statement

• **Set next statement**: changes the point of execution to a different line without altering current program state (variables retain their values)

| IDE | Method |
|---|---|
| Visual Studio | Right-click → *Set next statement*, or `Ctrl+Shift+F10` |
| Code::Blocks | Right-click → *Set next statement* |
| VS Code | Right-click → *Jump to cursor* (while debugging) |

### Jumping Forward — Skipping Code

```
Execution before:  line 10 → line 11 → line 12 → line 13
                                  ↑ jump to line 12
Execution after:   line 10 → line 12 → line 13
```

Use case: skip a function call without modifying source code.

### Jumping Backward — Re-executing Code

```
Execution before:  line 10 → line 11 → line 12
                                         ↑ jump back to line 11
Execution after:   line 10 → line 11 → line 11 → line 12
```

Use case: re-run a section to observe its behavior again.

### ⚠ Warnings

- Jumping does **not** restore variable state — values remain whatever they were at the point of the jump.
- Never jump to a different function — results in undefined behavior and likely a crash.

### Set Next Statement vs. Step Back

```
┌──────────────────────┬──────────────────────────────────────────┐
│ Command              │ Effect on program state                  │
├──────────────────────┼──────────────────────────────────────────┤
│ Step back            │ Rewinds execution AND variable state     │
│ Set next statement   │ Changes execution point only; state kept │
└──────────────────────┴──────────────────────────────────────────┘
```

---

# 3.8 — Using an Integrated Debugger: Watching Variables

## Watching Variables

• **Watching a variable**: inspecting the value of a variable while the program executes in debug mode

### Methods to Inspect a Variable

| Method | How | Best For |
|---|---|---|
| Mouse hover | Hover cursor over variable name in code | Quick one-time inspection |
| QuickWatch (VS) | Highlight variable name → right-click → QuickWatch | One-time inspection with subwindow |
| Watch window | Add variable name to persistent watch list | Tracking changes over time |
| Locals window | IDE-provided automatic listing | Viewing all local variables at once |

### Sample Program

```cpp
#include <iostream>

int main()
{
    int x{ 1 };
    std::cout << x << ' ';   // line 6

    x = x + 2;
    std::cout << x << ' ';   // line 9

    x = x + 3;
    std::cout << x << ' ';   // line 12

    return 0;
}
```

Execution state at each stop:

```
Run to line 6  →  x == 1
Run to line 9  →  x == 3
Run to line 12 →  x == 6
```

---

## Watch Window

• **Watch window**: a persistent debugger pane where named variables are displayed and automatically updated as execution steps forward

### Opening the Watch Window

| IDE | Location |
|---|---|
| Visual Studio | Debug menu → Windows → Watch → Watch 1 (requires active debug session) |
| Code::Blocks | Debug menu → Debugging windows → Watches |
| VS Code | Left panel above call stack (appears automatically in debug mode) |

### Adding Variables to Watch

Two methods:
1. Type the variable name directly into the leftmost column of the watch window
2. Right-click the variable in code → **Add Watch** (VS) or **Watch x** (Code::Blocks)

### Out-of-Scope Variables

```
Variable goes out of scope  →  shown as "not available" or grayed out
Variable returns to scope   →  value resumes displaying normally
```

Variables can remain in the watch window permanently; no cleanup needed.

---

## Breaking on Variable Value Changes

Some debuggers support **data breakpoints** — pausing execution when a watched variable's value changes.

**Visual Studio steps:**
1. Ensure variable is in the watch window
2. Step into the program
3. Right-click the variable in the watch window → **Break when value changes**

> **Note**: "Break when value changes" must be re-enabled at the start of each debugging session.

---

## Evaluating Expressions in the Watch Window

The watch window accepts arbitrary expressions, not just variable names:

```
Watch entry: x + 2
Result:      8        (when x == 6)
```

Expressions can also be added by highlighting them in the code editor and using the right-click context menu.

> **Warning**: Watched expressions use the *current* values of identifiers. Run to the relevant line before inspecting an expression to ensure all identifiers hold expected values.

---

## Locals Window

Automatically displays all local variables currently in scope — no manual entry required.

| IDE | Location |
|---|---|
| Visual Studio | Debug menu → Windows → Locals (requires active debug session) |
| Code::Blocks | Watch window → Locals node (expand if collapsed) |
| VS Code | VARIABLES section on left panel → expand Locals node |

> Check the Locals window first when debugging a function; local variables appear there without any setup.

---

# 3.9 — Using an Integrated Debugger: The Call Stack

## Core Concepts

• **Call stack**: A list of all active functions called to reach the current point of execution, including the return address for each frame
• **Call stack window**: A debugger window showing the current call stack state

## How the Call Stack Works

```
┌─────────────────────────────────────┐
│  Call Stack (top = currently active) │
├─────────────────────────────────────┤
│  a()        line 5   ◀ executing    │
│  b()        line 12  ◀ returns here │
│  main()     line 17  ◀ returns here │
│  [External Code]                    │
└─────────────────────────────────────┘
```

- New function called → pushed onto top of stack
- Function returns → popped from top; control returns to function below it

## Line Numbers in the Call Stack

- **Top entry** (currently executing function): line number = next line to execute when execution resumes
- **All other entries** (pending return functions): line number = next statement to execute after that function is returned to

## Progression Example

```cpp
#include <iostream>

void a()
{
    std::cout << "a() called\n";   // line 5
}

void b()
{
    std::cout << "b() called\n";   // line 10
    a();
}

int main()
{
    a();                           // line 16
    b();                           // line 17
    return 0;
}
```

### State at breakpoint on line 5 (first call from `main`)

```
┌───────────────────┐
│  a()     line 5   │  ◀ active
│  main()  line 17  │  ◀ will return here
└───────────────────┘
```

### State at breakpoint on line 10 (inside `b`)

```
┌───────────────────┐
│  b()     line 10  │  ◀ active
│  main()  line 17  │  ◀ will return here
└───────────────────┘
```

### State at breakpoint on line 5 (called from `b`)

```
┌───────────────────┐
│  a()     line 5   │  ◀ active
│  b()     line 12  │  ◀ will return here
│  main()  line 17  │  ◀ will return here
└───────────────────┘
```

## Accessing the Call Stack Window

| IDE            | Location |
|----------------|----------|
| Visual Studio  | Debug menu → Windows → Call Stack (requires active debug session) |
| Code::Blocks   | Debug menu → Debugging windows → Call stack |
| VS Code        | Left panel, visible automatically in debug mode |

## Key Use Case

Use the call stack window alongside breakpoints to determine **which sequence of function calls** led to the current point of execution.

---

## Finding Issues Before They Become Problems

## Preventing Errors

- Follow best practices and language conventions
- Keep functions short (ideally < 10 lines; > one screen is too long)
- Prefer standard library over custom code
- Comment code, start simple, avoid clever solutions
- Optimize for readability and maintainability, not performance

## Refactoring

• **Refactoring**: Making structural changes to code without changing its behavior, to increase organization and modularity

**Key rule**: Make *either* behavioral changes *or* structural changes in a single step, then retest — never both at once.

## Defensive Programming

• **Defensive programming**: Anticipating all ways software could be misused (by users or other developers) and adding handling for those cases

Example: If a function expects a non-negative integer, validate the input before proceeding rather than producing an indeterminate result.

## Finding Errors Quickly

### Unit Testing

• **Unit testing**: Testing small units of source code individually to verify correctness

```cpp
#include <iostream>

int add(int x, int y)
{
    return x + y;
}

void testadd()
{
    std::cout << "This function should print: 2 0 0 -2\n";
    std::cout << add(1, 1)   << ' ';  // expected: 2
    std::cout << add(-1, 1)  << ' ';  // expected: 0
    std::cout << add(1, -1)  << ' ';  // expected: 0
    std::cout << add(-1, -1) << ' ';  // expected: -2
}

int main()
{
    testadd();
    return 0;
}
```

Keep test functions around and re-run them after any change to the tested function.

### Constraints

• **Constraints-based techniques**: Adding extra code to verify assumptions are not violated at runtime (e.g., `assert`, `static_assert`)

Example: A factorial function asserts its argument is non-negative before computing.

Covered in depth in lesson 9.6 (Assert and static_assert).

### Static Analysis Tools

• **Static analysis tool** (linter): A program that analyzes source code without executing it to identify semantic issues and non-compliant patterns

```
┌─────────────────────────────────────────┐
│           Static Analysis               │
├─────────────────┬───────────────────────┤
│ Built-in        │ Your compiler         │
│                 │ (warnings/errors)     │
├─────────────────┼───────────────────────┤
│ Free tools      │ clang-tidy            │
│                 │ cpplint               │
│                 │ cppcheck              │
│                 │ SonarLint             │
├─────────────────┼───────────────────────┤
│ Paid tools      │ Coverity              │
│                 │ SonarQube             │
└─────────────────┴───────────────────────┘
```

**Best practice**: Run a static analysis tool on all programs, especially large ones where it may surface hundreds of potential issues.

---

# Chapter 3 Summary — Debugging

## Error Types

- **Syntax error**: invalid statement per C++ grammar rules; caught by compiler
- **Semantic error**: syntactically valid statement that does not do what was intended

## Debugging Process

```
1. Find the root cause
2. Understand the problem
3. Determine a fix
4. Repair the issue
5. Retest
```

Finding the root cause is typically the hardest step.

## Tactics for Finding Issues

- Comment out code to isolate the problem
- Use output statements to validate code flow
- Print variable values at key points
- Use `std::cerr` (not `std::cout`) for debug print statements
- Prefer a debugger over print-statement debugging

## Supporting Concepts

- **Static analysis tools**: analyze code for semantic issues without running it
- **Log file**: file recording events that occur during program execution; writing to it is called **logging**
- **Refactoring**: restructuring code without changing behavior (improves organization, modularity, or performance)
- **Unit testing**: testing small units of source code in isolation to verify correctness
- **Defensive programming**: anticipating misuse of software and mitigating it proactively
- **Program state**: all tracked information at a point in time — variable values, call history, current execution point

## Debugger Concepts

- **Debugger**: tool for controlling program execution and inspecting program state at runtime
- **Integrated debugger**: debugger built into the code editor

## Stepping Commands

| Command | Behavior |
|---|---|
| **Step into** | Execute next statement; jump into any function call |
| **Step over** | Execute next statement; run function calls without entering them |
| **Step out** | Run remaining code in current function; return control on return |
| **Run to cursor** | Execute until reaching the cursor-selected statement |
| **Continue** | Run until termination or breakpoint |
| **Start** | Same as continue, but from the beginning |

## Breakpoints and Execution Control

- **Breakpoint**: marker that halts execution when reached
- **Set next statement**: moves the execution point to another statement (jump forward to skip code, or backward to re-execute)

## Inspection Windows

- **Watch window**: inspect values of variables or expressions during debug execution
- **Call stack**: ordered list of all active functions leading to the current execution point
- **Call stack window**: debugger panel displaying the call stack

### Call Stack Example

Given execution paused inside `d()`:

```
┌─────────────┐
│     d       │  ◀ current
├─────────────┤
│     b       │
├─────────────┤
│     a       │
├─────────────┤
│    main     │
└─────────────┘
```

## Common Bug Patterns

### Discarded Return Value
```cpp
// Bug: return value ignored
readNumber(x);
x = x + readNumber(x);

// Fix: capture return values
int x { readNumber() };
x = x + readNumber();
```

### Wrong Variable Assignment
```cpp
// Bug: both calls assign to x; y stays 0 → division by zero
x = readNumber();
x = readNumber();   // should be y

// Fix:
int x { readNumber() };
int y { readNumber() };
```

### Wrong Data Type
```cpp
// Bug: char stores character codes, not numeric values
// Input 8 → stored as 56 (ASCII), input 4 → stored as 52
char x{};
std::cin >> x;

// Fix:
int x{};
std::cin >> x;
```