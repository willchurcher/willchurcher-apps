# Chapter 5 — Notes


---

# 5.1 — Constant Variables (Named Constants)

## Types of Constants

• **Named constant**: a constant value associated with an identifier (also called a *symbolic constant*)
• **Literal constant**: a constant value not associated with an identifier

Three ways to define a named constant in C++:
1. Constant variables (this lesson)
2. Object-like macros with substitution text
3. Enumerated constants

---

## Constant Variables

• **Constant variable**: a variable whose value cannot be changed after initialization

### Declaration Syntax

```cpp
const double gravity { 9.8 };  // preferred: const before type
int const sidesInSquare { 4 }; // "east const" style — valid but not preferred
```

The type of `gravity` above is `const double` — `const` is part of the type.

**Best practice**: Place `const` before the type.

### Initialization Rules

```cpp
const double gravity;  // error: must be initialized at definition
gravity = 9.9;         // error: cannot assign to const variable
```

The initializer may be a non-constant value:

```cpp
int age{};
std::cin >> age;

const int constAge { age }; // ok: non-const initializer for const variable

age = 5;      // ok: age is non-const
constAge = 6; // error: constAge is const
```

---

## Naming Convention

No special naming convention is required for const variables. Prefer the same convention used for non-const variables (e.g., `earthGravity`), not `EARTH_GRAVITY` or `kEarthGravity`.

---

## Const in Functions

### Const Parameters

```cpp
void printInt(const int x)
{
    std::cout << x << '\n';
}
```

**Best practice**: Do not use `const` for by-value parameters — the parameter is a copy destroyed at function end; `const` adds clutter without meaningful benefit.

### Const Return Values

```cpp
const int getValue() { return 5; }
```

**Best practice**: Do not use `const` when returning by value — it is ignored for fundamental types and can impede move-semantics optimizations.

---

## Why Variables Should Be Constant

```
Non-const variable ──► moving part ──► more complexity, more defect risk
Const variable     ──► fixed part  ──► simpler reasoning, fewer bugs
```

Benefits of `const`:
- Prevents accidental value changes
- Enables more compiler optimizations
- Reduces reasoning complexity when debugging

**Best practice**: Make variables constant whenever possible. Exceptions: by-value parameters and by-value return types.

---

## Object-Like Macros vs. Constant Variables

```cpp
#define MY_NAME "Alex"   // macro named constant
const char* myName = "Alex"; // prefer this style instead
```

### Problems with Macros

| Problem | Detail |
|---|---|
| No scope rules | Replaced everywhere after `#define`, causing unintended substitution |
| Debugger invisible | Macros are replaced before compilation; debuggers cannot inspect them |
| Inconsistent behavior | Substitution semantics differ from all other C++ constructs |

Example of macro scope breakage:
```cpp
#define gravity 9.8

void printGravity(double gravity) // 'gravity' replaced with 9.8 → compile error
{
    std::cout << gravity << '\n';
}
```

**Best practice**: Prefer constant variables over object-like macros with substitution text.

---

## Type Qualifiers

• **Type qualifier**: a keyword applied to a type that modifies its behavior
• **Const qualifier**: the `const` keyword used to declare a constant variable
• **Volatile qualifier**: tells the compiler an object's value may change at any time (rarely used; disables certain optimizations)

As of C++23, only two type qualifiers exist: `const` and `volatile` (collectively called **cv-qualifiers**).

| Term | Meaning |
|---|---|
| cv-unqualified | Type with no qualifiers (e.g., `int`) |
| cv-qualified | Type with one or more qualifiers (e.g., `const int`) |
| possibly cv-qualified | Type that may or may not be cv-qualified |

---

# 5.2 — Literals

## Definition

• **Literal**: a value inserted directly into code whose meaning cannot be redefined
• **Literal constant**: synonym for literal; `5` always means the integral value 5

## Default Literal Types

| Literal value | Examples | Default type |
|---|---|---|
| integer | `5`, `0`, `-3` | `int` |
| boolean | `true`, `false` | `bool` |
| floating point | `1.2`, `0.0`, `3.4` | `double` (not `float`) |
| character | `'a'`, `'\n'` | `char` |
| C-style string | `"Hello, world!"` | `const char[14]` |

## Literal Suffixes

| Data type | Suffix | Meaning |
|---|---|---|
| integral | `u` / `U` | `unsigned int` |
| integral | `l` / `L` | `long` |
| integral | `ul`, `UL`, etc. | `unsigned long` |
| integral | `ll` / `LL` | `long long` |
| integral | `ull`, `ULL`, etc. | `unsigned long long` |
| integral | `z` / `Z` | signed `std::size_t` (C++23) |
| integral | `uz`, `UZ`, etc. | `std::size_t` (C++23) |
| floating point | `f` / `F` | `float` |
| floating point | `l` / `L` | `long double` |
| string | `s` | `std::string` |
| string | `sv` | `std::string_view` |

### Suffix Casing Rules
- `s` and `sv` must be **lower case**
- Two consecutive `l`/`L` must have **matching case** (`lL` and `Ll` are invalid)
- **Best practice**: prefer `L` (upper case) over `l` (lower case) to avoid confusion with `1`

## Integral Literals

```cpp
#include <iostream>

int main()
{
    std::cout << 5  << '\n'; // int (default)
    std::cout << 5L << '\n'; // long
    std::cout << 5u << '\n'; // unsigned int
    return 0;
}
```

Non-suffixed `int` literals can initialize non-`int` types; the compiler converts automatically:

```cpp
int main()
{
    int          a { 5 }; // direct match
    unsigned int b { 6 }; // int 6 → unsigned int 6
    long         c { 7 }; // int 7 → long 7
    return 0;
}
```

## Floating Point Literals

Default type is `double`; use `f` suffix for `float`:

```cpp
#include <iostream>

int main()
{
    std::cout << 5.0  << '\n'; // double (default)
    std::cout << 5.0f << '\n'; // float
    return 0;
}
```

### Common Gotcha

```cpp
float f { 4.1 };  // ⚠ warning: 4.1 is double, converting to float loses precision
```

Fix with either:

```cpp
float  f { 4.1f }; // suffix makes literal float — types match
double d { 4.1  }; // change variable to double — types match
```

### Scientific Notation

```cpp
double avogadro    { 6.02e23  }; // 6.02 × 10^23
double protonCharge{ 1.6e-19  }; // 1.6 × 10^-19
double pi          { 3.14159  }; // standard notation
double bad         { 0.       }; // avoid: decimal hard to see; prefer 0.0
```

## String Literals

• **String**: a collection of sequential characters representing text
• **C-style string** / **C-string**: string type inherited from C; not a fundamental type in C++

### Null Terminator

Every C-style string literal has an implicit `'\0'` appended:

```
"hello"  →  'h' 'e' 'l' 'l' 'o' '\0'
              0    1   2   3   4    5   (6 chars total)
```

• **Null terminator** (`'\0'`): special character (ASCII 0) marking the end of a string
• **Null-terminated string**: a string ending with `'\0'`
• This is why `"Hello, world!"` has type `const char[14]`, not `const char[13]`

### Lifetime

```
┌─────────────────────────────────────────────────────────┐
│  C-style string literals                                 │
│  • const objects created at program start               │
│  • guaranteed to exist for the entire program lifetime  │
├─────────────────────────────────────────────────────────┤
│  std::string / std::string_view literals                 │
│  • temporary objects                                     │
│  • destroyed at end of the full expression              │
└─────────────────────────────────────────────────────────┘
```

## Magic Numbers

• **Magic number**: a literal whose meaning is unclear or that may need to change later

```cpp
// ❌ Bad — meaning of 30 is unclear; updating is error-prone
const int maxStudentsPerSchool{ numClassrooms * 30 };
setMax(30);
```

```cpp
// ✅ Good — use named constexpr constants
const int maxStudentsPerClass { 30 };
const int totalStudents { numClassrooms * maxStudentsPerClass };

const int maxNameLength { 30 };
setMax(maxNameLength);
```

### When Literals Are NOT Magic

Obvious-context values unlikely to change are acceptable:

```cpp
int idGenerator { 0 };
idGenerator = idGenerator + 1; // 0 and 1 are obvious

int kmToM(int km) { return km * 1000; } // 1000 is an obvious conversion factor

printPlayerInfo(1); // sequential ids
printPlayerInfo(2);
```

> **Best practice**: avoid magic numbers; use `constexpr` variables instead (see 5.6).

---

# 5.3 — Numeral Systems (Decimal, Binary, Hexadecimal, and Octal)

## Numeral Systems Overview

• **Numeral system**: A collection of symbols (digits) used to represent numbers
• **Decimal (base 10)**: Digits 0–9; default in C++
• **Binary (base 2)**: Digits 0–1
• **Octal (base 8)**: Digits 0–7
• **Hexadecimal (base 16)**: Digits 0–9, A–F

```
Decimal         0     1     2     3     4     5     6     7     8     9    10    11    12    13    14    15
Binary          0     1    10    11   100   101   110   111  1000  1001  1010  1011  1100  1101  1110  1111
Octal           0     1     2     3     4     5     6     7    10    11    12    13    14    15    16    17
Hexadecimal     0     1     2     3     4     5     6     7     8     9     A     B     C     D     E     F
```

**Counting rule**: Rightmost digit increments from `0` to `base-1`; when it reaches `base`, reset to `0` and carry left.

---

## Literal Prefixes

| Base | Prefix | Example | Decimal value |
|------|--------|---------|---------------|
| Decimal | (none) | `12` | 12 |
| Octal | `0` | `012` | 10 |
| Hexadecimal | `0x` | `0xF` | 15 |
| Binary (C++14) | `0b` | `0b1010` | 10 |

```cpp
int a { 12 };     // decimal
int b { 012 };    // octal  → 10 decimal
int c { 0xF };    // hex    → 15 decimal
int d { 0b1010 }; // binary → 10 decimal (C++14)
```

> **Gotcha**: A leading `0` makes a literal octal, not decimal. Avoid octal literals.

---

## Digit Separators (C++14)

Use a single quote `'` as a visual separator inside any literal. It has no effect on value.

```cpp
int bin   { 0b1011'0010 };      // binary
long val  { 2'132'673'462 };    // decimal
```

> **Gotcha**: The separator cannot appear before the first digit.
> ```cpp
> int bad { 0b'1011'0010 }; // error
> ```

---

## Hexadecimal ↔ Binary Relationship

One hex digit = exactly 4 bits; two hex digits = one byte.

```
┌─────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Hex │  0   │  1   │ ...  │  8   │  9   │  A   │  ...  │  F  │
├─────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ Bin │ 0000 │ 0001 │ ...  │ 1000 │ 1001 │ 1010 │ ...  │ 1111 │
└─────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

32-bit binary `0011 1010 0111 1111 1001 1000 0010 0110` = hex `3A7F 9826`

---

## Output Manipulators

`std::dec`, `std::oct`, `std::hex` persist until changed.

```cpp
#include <iostream>

int main()
{
    int x { 12 };
    std::cout << x << '\n';           // 12  (decimal, default)
    std::cout << std::hex << x << '\n'; // c   (hex)
    std::cout << x << '\n';           // c   (still hex)
    std::cout << std::oct << x << '\n'; // 14  (octal)
    std::cout << std::dec << x << '\n'; // 12  (back to decimal)
}
```

---

## Binary Output

### Using `std::bitset`

```cpp
#include <bitset>
#include <iostream>

int main()
{
    std::bitset<8> b1{ 0b1100'0101 }; // initialize with binary literal
    std::bitset<8> b2{ 0xC5 };        // initialize with hex literal

    std::cout << b1 << '\n';                        // 11000101
    std::cout << b2 << '\n';                        // 11000101
    std::cout << std::bitset<4>{ 0b1010 } << '\n'; // 1010 (temporary)
}
```

• `std::bitset<N>` stores exactly `N` bits; `N` must be a compile-time constant.
• Accepts any integral initializer (decimal, hex, binary, octal).

### Using Format/Print Library (C++20/23)

```cpp
#include <format>  // C++20
#include <print>   // C++23
#include <iostream>

int main()
{
    std::cout << std::format("{:b}\n",  0b1010); // 1010
    std::cout << std::format("{:#b}\n", 0b1010); // 0b1010
    std::println("{:b} {:#b}", 0b1010, 0b1010);  // 1010 0b1010
}
```

| Format spec | Output |
|-------------|--------|
| `{:b}` | binary digits only |
| `{:#b}` | `0b`-prefixed binary digits |

---

# 5.4 — The As-If Rule and Compile-Time Optimization

## Optimization

• **Optimization**: modifying software to make it work more efficiently (faster execution, fewer resources)
• **Profiler**: tool that measures how long various parts of a program take to run
• **Optimizer**: a program that automatically optimizes another program

Modern C++ compilers are **optimizing compilers** — they apply optimizations transparently during compilation without modifying source files.

Compilers support multiple optimization levels (speed vs. size tradeoffs). Most compilers default to **no optimization**; IDEs typically enable optimization in release builds and disable it in debug builds.

---

## The As-If Rule

• **As-if rule**: the compiler may modify a program in any way it likes, as long as the modifications do not affect the program's **observable behavior**

> **Exception**: unnecessary copy/move constructor calls may be elided even if they have observable behavior (copy elision).

---

## Compile-Time Evaluation

• **Compile-time evaluation**: fully or partially evaluating an expression at compile-time rather than at runtime

```
┌──────────────────────────────────────────────┐
│  Source code  ──▶  Compiler  ──▶  Executable │
│                       │                       │
│              evaluates expressions            │
│              at compile-time                  │
└──────────────────────────────────────────────┘
```

**Result**: faster and smaller executables, at the cost of slightly slower compilation.

---

## Constant Folding

• **Constant folding**: replacing an expression with all-literal operands with the computed result

```cpp
// Written as:
int x { 3 + 4 };

// Compiled as-if:
int x { 7 };
```

Also applies to subexpressions:

```cpp
std::cout << 3 + 4 << '\n';
// Optimized to:
std::cout << 7 << '\n';
```

---

## Constant Propagation

• **Constant propagation**: replacing a variable known to hold a constant value with that value directly

```cpp
// Written as:
int x { 7 };
std::cout << x << '\n';

// Compiled as-if:
int x { 7 };
std::cout << 7 << '\n';  // no memory fetch for x
```

Constant propagation can feed into constant folding:

```cpp
int x { 7 };
int y { 3 };
std::cout << x + y << '\n';
// Step 1 (propagation): x + y → 7 + 3
// Step 2 (folding):     7 + 3 → 10
std::cout << 10 << '\n';
```

---

## Dead Code Elimination

• **Dead code elimination**: removing code that executes but has no effect on observable behavior
• **Optimized out** (/ **optimized away**): a variable or expression removed because it is no longer needed

```cpp
// Written as:
int x { 7 };
std::cout << 7 << '\n';

// x is never used → optimized to:
std::cout << 7 << '\n';
```

---

## Chained Optimization Example

```
int x { 3 + 4 };          // original
std::cout << x << '\n';
        │
        ▼  constant folding
int x { 7 };
std::cout << x << '\n';
        │
        ▼  constant propagation
int x { 7 };
std::cout << 7 << '\n';
        │
        ▼  dead code elimination
std::cout << 7 << '\n';
```

---

## Helping the Compiler: `const` Variables

Non-`const` variables require the compiler to prove the value never changes before applying constant propagation. Declaring variables `const` provides that guarantee directly.

```cpp
// Non-const: compiler must prove x is unchanged
int x { 7 };

// Const: compiler is guaranteed x cannot change
const int x { 7 };   // easier to optimize out entirely
```

> **Rule**: use `const` variables wherever possible to enable more effective optimization.

---

## Optimization and Debugging

| Build Type | Optimization | Effect |
|---|---|---|
| Debug build | Off | Compiled code closely matches source |
| Release build | On | Variables/expressions may be removed or reordered |

When optimization is on:
- Watching an optimized-out variable: debugger cannot locate it
- Stepping into an optimized-away function: debugger skips it
- Strange debugger behavior is most likely caused by optimization

---

## Compile-Time vs. Runtime Constants (Informal Terms)

• **Compile-time constant**: value known at compile-time (literals; `const` objects initialized by compile-time constants)
• **Runtime constant**: value determined at runtime (`const` function parameters; `const` objects initialized by non-constants or runtime values)

```cpp
int five() { return 5; }
int pass(const int x) { return x; }  // x is a runtime constant

const int b { 5 };       // compile-time constant
const int d { b };       // compile-time constant (b is compile-time)

const int e { a };       // runtime constant (a is non-const)
const int g { five() };  // runtime constant (return value unknown at compile-time)
const int h { pass(5) }; // runtime constant
```

**Limitations of these terms**:
- Some runtime constants (and non-constants) can still be evaluated at compile-time via the as-if rule
- Some compile-time constants cannot be used in compile-time language features

> Prefer the terminology introduced in lesson 5.5 (constant expressions) over these informal categories.

---

# 5.5 — Constant Expressions

## Background

By default, expressions evaluate at runtime. Some expressions *must* evaluate at runtime (e.g., `std::cin`, `std::cout`). Under the as-if rule, the compiler *may* shift other expressions to compile-time — but gives no guarantees or feedback.

**Compile-time programming**: the use of language features that explicitly result in compile-time evaluation.

Benefits:
- **Performance**: smaller, faster programs
- **Versatility**: compile-time values can be used anywhere a compile-time value is required
- **Predictability**: compiler errors if code cannot evaluate at compile-time
- **Quality**: certain bugs caught at compile-time; undefined behavior is disallowed at compile-time

Key features enabling compile-time programming: constexpr variables, constexpr functions, templates, `static_assert`.

---

## Constant Expressions

- • **Constant expression**: an expression where every component must be evaluatable at compile-time
- • **Runtime expression**: an expression that is not a constant expression (evaluates at runtime)

```
┌─────────────────────────────────────────────────────┐
│                    Expressions                      │
├──────────────────────────┬──────────────────────────┤
│   Constant Expressions   │   Runtime Expressions    │
│  (compile-time capable)  │  (runtime only)          │
└──────────────────────────┴──────────────────────────┘
```

---

## What Can Appear in a Constant Expression

### Allowed
- Literals (`5`, `1.2`, `"hello"`)
- Most operators whose operands are constant expressions (`3 + 4`, `2 * sizeof(int)`)
- `const` integral variables with a constant expression initializer (`const int x { 5 };`)
- `constexpr` variables
- `constexpr` function calls with constant expression arguments

### Not Allowed
- Non-const variables
- `const` non-integral variables, even with constant expression initializer (`const double d { 1.2 };`)
- Return values of non-`constexpr` functions
- Function parameters (even in constexpr functions)
- Operators with non-constant-expression operands (`std::cout << 5`)
- Operators: `new`, `delete`, `throw`, `typeid`, `,` (comma)

---

## Examples

```cpp
// Constant expressions:
5;                    // literal
1.2 * 3.4;            // operator with constant-expression operands
sizeof(int) + 1;      // sizeof known at compile-time

const int a { 5 };    // const integral, constant-expression initializer → usable in constant expressions
const int b { a };    // b is usable in constant expressions
const long c { a+2 }; // c is usable in constant expressions

// Runtime expressions:
getNumber();          // non-constexpr function return value
five();               // non-constexpr function return value (even if body returns 5)
std::cout << 5;       // std::cout is not a constant expression

int d { 5 };          // non-const → NOT usable in constant expressions
const int e { d };    // initializer is not a constant expression → NOT usable
const double f { 1.2 };// non-integral const → NOT usable in constant expressions
```

---

## When Constant Expressions Are Evaluated

- • **Manifestly constant-evaluated expression**: an expression that *must* be evaluated at compile-time

```
┌──────────────────────────────────────────────────────────────┐
│  Context requires constant expression?                       │
├───────────────┬──────────────────────────────────────────────┤
│      YES      │  Compiler MUST evaluate at compile-time      │
│      NO       │  Compiler MAY evaluate at compile-time       │
│               │  (likely does so when optimizations enabled) │
└───────────────┴──────────────────────────────────────────────┘
```

```cpp
const int x { 3 + 4 }; // MUST evaluate at compile-time (x usable in constant expressions)
int y { 3 + 4 };        // MAY evaluate at compile-time or runtime
```

### Likelihood of Compile-Time Evaluation

| Expression type | Context | Likelihood |
|---|---|---|
| Non-constant, values unknown at compile-time | any | Never |
| Non-constant, values known at compile-time | any | Possibly (as-if rule) |
| Constant expression | does not require compile-time | Likely |
| Constant expression | requires compile-time | Always |

---

## Why Constant Expressions Must Use Constant Objects

Non-const variables can be modified at runtime (e.g., via `std::cin`), so their values are not guaranteed to be known at compile-time. Constants cannot change after initialization, so a `const` variable with a compile-time initializer always has a compile-time-known value.

```cpp
int x { 5 };         // value known here...
std::cin >> x;       // ...but not after this → x cannot be in a constant expression
```

---

# 5.6 — Constexpr Variables

## The `const` Challenge for Compile-Time Constants

Using `const` alone has three problems:

1. **Ambiguity** — it's not always clear if a `const` variable is usable in a constant expression
2. **No enforcement** — the compiler silently creates a runtime constant instead of erroring
3. **Limited scope** — compile-time `const` only works for integral types

```cpp
const int c { 5 };           // clearly compile-time constant
const int d { someVar };     // unclear — depends on someVar's definition
const int e { getValue() };  // unclear — depends on getValue()'s definition
```

## The `constexpr` Keyword

• **`constexpr` variable**: a variable that is always a compile-time constant; must be initialized with a constant expression

```cpp
constexpr double gravity { 9.8 }; // ok: 9.8 is a constant expression
constexpr int sum { 4 + 5 };      // ok: 4 + 5 is a constant expression
constexpr int something { sum };  // ok: sum is a constant expression

int age{};
std::cin >> age;
constexpr int myAge { age };      // compile error: age is not a constant expression
constexpr int f { five() };       // compile error: five() returns non-constexpr
```

`constexpr` works for non-integral types too:
```cpp
constexpr double d { 1.2 }; // valid — const does not allow this for compile-time use
```

## `const` vs `constexpr` for Variables

| Property | `const` | `constexpr` |
|---|---|---|
| Value changeable after init | No | No |
| Initializer must be compile-time | No | **Yes** |
| Can be used in constant expressions | Only integral + constant-expr init | **Always** |
| Evaluated at | Runtime or compile-time | Runtime or compile-time |

- `constexpr` variables are **implicitly `const`**
- `const` variables are **not** implicitly `constexpr`
- `constexpr` is **not** part of the object's type — `constexpr int` has type `const int`
- Declaring a variable both `constexpr` and `const` is redundant

## Best Practice

```
┌─────────────────────────────────────────────────────────────────┐
│ Initializer is a constant expression  →  use constexpr          │
│ Initializer is NOT a constant expression  →  use const          │
└─────────────────────────────────────────────────────────────────┘
```

> **Caveat**: Types using dynamic memory allocation (`std::string`, `std::vector`, etc.) are not fully `constexpr`-compatible. Use `const` for those, or prefer `constexpr`-compatible alternatives like `std::string_view` or `std::array`.

## Const and Constexpr Function Parameters

- Function parameters are initialized at **runtime**
- `const` parameters → treated as **runtime** constants even if the argument is a compile-time constant
- Parameters **cannot** be declared `constexpr`

## Terminology

| Term | Definition |
|---|---|
| **Compile-time constant** | Value/non-modifiable object whose value must be known at compile-time (e.g. literals, `constexpr` variables) |
| **`constexpr`** | Keyword declaring objects as compile-time constants (and functions evaluable at compile-time) |
| **Constant expression** | Expression containing only compile-time constants and operators/functions supporting compile-time evaluation |
| **Runtime expression** | An expression that is not a constant expression |
| **Runtime constant** | A value/non-modifiable object that is not a compile-time constant |

## Constexpr Functions (Brief Introduction)

• **Constexpr function**: a function that can be called in a constant expression

```cpp
constexpr int cmax(int x, int y)
{
    if (x > y) return x;
    else        return y;
}

constexpr int m6 { cmax(5, 6) }; // must evaluate at compile-time (ok)
constexpr int m3 { max(5, 6) };  // compile error: max is not constexpr
```

Evaluation rules:
```
┌──────────────────────────────────────────────────────────────────┐
│ constexpr function called in constexpr context                   │
│   + all arguments are constant expressions  →  compile-time      │
│ constexpr function called in non-constexpr context               │
│   →  may evaluate at compile-time or runtime                     │
└──────────────────────────────────────────────────────────────────┘
```

- Declared with `constexpr` before return type
- Key rule: **all arguments must be constant expressions** for compile-time eligibility

---

# Introduction to `std::string`

## Why Not C-Style String Variables

C-style string variables are:
- Hard to work with (no assignment to change value)
- Dangerous (copying a larger string into smaller space → undefined behavior)

Modern C++ provides `std::string` and `std::string_view` as safer alternatives.

---

## Creating `std::string` Objects

Requires `#include <string>`.

```cpp
std::string name {};          // empty string
std::string name { "Alex" };  // initialized with string literal
name = "John";                // assignment works normally
```

• **`std::string`**: A class type that stores and manages a sequence of characters; supports dynamic resizing at runtime.

Numeric strings are **not** numbers:
```cpp
std::string myID{ "45" }; // "45" cannot be used in arithmetic
```

---

## Output

```cpp
std::string name { "Alex" };
std::cout << name << '\n';   // prints: Alex
```

Empty strings print nothing between any surrounding characters.

---

## Variable-Length Strings

`std::string` handles strings of any length through **dynamic memory allocation** — it requests additional memory at runtime when needed. This makes it flexible but comparatively slow.

```cpp
name = "Jason";  // longer — OK
name = "Jay";    // shorter — OK
```

---

## Input with `std::cin`

### Problem: `operator>>` stops at whitespace

```cpp
std::cin >> name; // reads only up to first space
```

Input `"John Doe"` → `name` receives `"John"`, `" Doe"` stays in the buffer.

### Solution: `std::getline()`

```cpp
std::getline(std::cin >> std::ws, name); // reads entire line
```

---

## `std::ws` Input Manipulator

• **`std::ws`**: An input manipulator that discards all leading whitespace from `std::cin` before extraction.

**Why it's needed:** `operator>>` leaves a trailing `'\n'` in the buffer. Without `std::ws`, the next `std::getline()` sees that newline and reads an empty string.

```
Buffer after typing "2" + Enter:
┌───┬────┐
│ 2 │ \n │  ← \n left behind by operator>>
└───┴────┘
         ▲
         std::getline() reads this without std::ws
```

**With `std::ws`:**
```cpp
std::getline(std::cin >> std::ws, name); // skips the '\n', then reads
```

> `std::ws` is **not** preserved across calls — add it to every `std::getline()`.

### Extraction rules summary

| Method | Ignores leading whitespace? | Stops at |
|---|---|---|
| `operator>>` | Yes | Non-leading whitespace |
| `std::getline()` (no `std::ws`) | No | Newline |
| `std::getline(std::cin >> std::ws, ...)` | Yes | Newline |

---

## String Length

```cpp
std::string name{ "Alex" };
std::cout << name.length(); // prints 4 (null-terminator not counted)
```

- `length()` is a **member function**: called as `object.function()`, not `function(object)`
- Returns an **unsigned** integral value (`size_t`)

To avoid signed/unsigned mismatch:
```cpp
int len { static_cast<int>(name.length()) };
```

C++20 alternative using signed type (`std::ptrdiff_t`):
```cpp
#include <iostream>
#include <string>
std::ssize(name); // returns signed length
```

---

## Performance Considerations

| Operation | Cost | Notes |
|---|---|---|
| Initialization | Expensive | Makes a copy of the source string |
| Pass by value | Expensive | Creates another copy |
| Return by value (local var) | OK | Move semantics avoid the copy |

**Do not pass `std::string` by value.** Use `std::string_view` instead (covered in lesson 5.8).

**Returning by value is OK** when returning:
- A local `std::string` variable
- A `std::string` returned by value from another call
- A `std::string` temporary created in the return statement

---

## `std::string` Literals

Double-quoted literals are C-style strings by default. Use the `s` suffix for `std::string` literals:

```cpp
#include <string>
using namespace std::string_literals; // enables the s suffix

std::string s1 { "hello"s };  // std::string literal
std::cout << "foo\n";         // C-style string literal
std::cout << "goo\n"s;        // std::string literal
```

---

## Constexpr Strings

```cpp
constexpr std::string name{ "Alex"s }; // compile error in C++17; very limited in C++20/23
```

Use `std::string_view` for compile-time strings.

---

## Complete Input Example

```cpp
#include <iostream>
#include <string>

int main()
{
    std::cout << "Enter your full name: ";
    std::string name{};
    std::getline(std::cin >> std::ws, name);

    std::cout << "Enter your favorite color: ";
    std::string color{};
    std::getline(std::cin >> std::ws, color);

    std::cout << "Your name is " << name
              << " and your favorite color is " << color << '\n';
    return 0;
}
```

---

# Introduction to `std::string_view`

## The Problem with `std::string`

Initializing or copying a `std::string` is slow because it allocates memory and copies the string data.

```cpp
std::string s{ "Hello, world!" }; // copies the string literal into s
```

Passing `std::string` by value compounds the cost — each call makes another copy.

```cpp
void printString(std::string str) { ... } // another copy on every call
```

## `std::string_view` (C++17)

• **`std::string_view`**: a read-only, non-owning view of an existing string — no copy is made

Defined in `<string_view>`.

```cpp
#include <iostream>
#include <string_view>

void printSV(std::string_view str)
{
    std::cout << str << '\n';
}

int main()
{
    std::string_view s{ "Hello, world!" }; // no copy
    printSV(s);                            // no copy
    return 0;
}
```

> **Best practice**: Prefer `std::string_view` over `std::string` for read-only strings, especially function parameters.

## Initialization Sources

`std::string_view` can be initialized from any string type:

```cpp
std::string_view s1{ "Hello, world!" };  // from C-style string literal
std::string_view s2{ someStdString };    // from std::string
std::string_view s3{ anotherSV };        // from std::string_view
```

## Implicit Conversion Rules

```
┌──────────────────────┬────────────────────────┬──────────────────────┐
│ From                 │ To std::string_view     │ To std::string       │
├──────────────────────┼────────────────────────┼──────────────────────┤
│ C-style string       │ implicit ✓             │ implicit ✓           │
│ std::string          │ implicit ✓             │ copy (implicit) ✓    │
│ std::string_view     │ implicit ✓             │ NO implicit ✗        │
└──────────────────────┴────────────────────────┴──────────────────────┘
```

A `std::string_view` parameter accepts C-style strings, `std::string`, and `std::string_view` arguments without issue.

### Converting `std::string_view` → `std::string`

Must be done explicitly to prevent accidental expensive copies:

```cpp
std::string_view sv{ "Hello, world!" };

std::string s{ sv };                        // explicit construction — OK
printString(static_cast<std::string>(sv));  // explicit cast — OK
// printString(sv);                         // compile error — no implicit conversion
```

## Assignment Rebinds the View

Assignment makes the view point to a new string; it does **not** modify the previously viewed string.

```cpp
std::string name{ "Alex" };
std::string_view sv{ name };  // viewing "Alex"
sv = "John";                  // sv now views "John"; name still holds "Alex"
```

## String View Literals

| Literal  | Type                 | Suffix |
|----------|----------------------|--------|
| `"foo"`  | C-style string       | none   |
| `"foo"s` | `std::string`        | `s`    |
| `"foo"sv`| `std::string_view`   | `sv`   |

```cpp
using namespace std::string_literals;       // enables s suffix
using namespace std::string_view_literals;  // enables sv suffix

auto a = "foo"sv;  // std::string_view
```

The `sv` suffix must be lowercase. Initializing a `std::string_view` from a plain C-style literal is fine and preferred.

## `constexpr std::string_view`

`std::string_view` fully supports `constexpr`; `std::string` does not.

```cpp
constexpr std::string_view s{ "Hello, world!" }; // preferred for string constants
```

• **Rule**: Use `constexpr std::string_view` for compile-time string symbolic constants.

---

# std::string_view (Part 2)

## Ownership vs Viewing

• **Owner**: acquires, manages, and disposes of data; has sole responsibility for that data
• **Viewer**: reads data that exists elsewhere; has no responsibility for, or control over, that data
• **Dangling view**: a `std::string_view` that is viewing a string that has been destroyed or invalidated

```
┌─────────────────────────────────────────────────────┐
│  std::string (owner)                                │
│  ┌─────────────────────────┐                        │
│  │ owns copy of string data│◀── allocated on init  │
│  └─────────────────────────┘                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  std::string_view (viewer)                          │
│  ┌──────────┐     points to     ┌────────────────┐  │
│  │  sv      │──────────────────▶│ existing string│  │
│  └──────────┘                   └────────────────┘  │
│   no copy made; dependent on the viewed object      │
└─────────────────────────────────────────────────────┘
```

### Why std::string Copies Its Initializer
- After initialization, the caller may modify or destroy the initializer
- `std::string` copies to guarantee independence from the initializer
- An initialized object has no control over what happens to the initialization value afterward

---

## std::string_view Safety Rules

### Safe Initializers
```cpp
std::string_view sv1 { "hello" };          // ✓ C-style literal (lives entire program)
std::string sv2 { "hello" };
std::string_view sv3 { sv2 };              // ✓ ok if sv2 outlives sv3
std::string_view sv4 { sv1 };             // ✓ ok if sv1 outlives sv4
```

### Dangling View: Destroyed String
```cpp
std::string_view sv{};
{
    std::string s{ "Hello, world!" };
    sv = s;
} // s destroyed here — sv is now dangling
std::cout << sv << '\n'; // undefined behavior
```

### Dangling View: Temporary Return Value
```cpp
std::string getName() { return "Alex"; }

std::string_view name { getName() }; // getName() returns a temporary
// temporary is destroyed after this line — name is dangling
std::cout << name << '\n'; // undefined behavior
```

### Dangling View: std::string Literal
```cpp
using namespace std::string_literals;
std::string_view name { "Alex"s }; // "Alex"s creates a temporary std::string
// temporary destroyed immediately — name is dangling
```
> **Warning**: Do not initialize a `std::string_view` with a `std::string` literal (`s` suffix).

### Dangling View: Modifying Underlying String
```cpp
std::string s { "Hello, world!" };
std::string_view sv { s };
s = "Hello, a!";           // invalidates sv
std::cout << sv << '\n';   // undefined behavior
```
> **Rule**: Modifying a `std::string` invalidates all views into it.

---

## Revalidating an Invalidated View

Assign the `std::string_view` back to a valid string:

```cpp
std::string s { "Hello, world!" };
std::string_view sv { s };

s = "Hello, universe!";  // sv is now invalidated
sv = s;                   // revalidate: sv now views s again
std::cout << sv << '\n'; // prints "Hello, universe!"
```

---

## Returning std::string_view from Functions

### Unsafe: Returns View of Local Variable
```cpp
std::string_view getBoolName(bool b)
{
    std::string t { "true" };
    std::string f { "false" };
    if (b) return t;   // dangling — t destroyed at end of function
    return f;
} // undefined behavior when result is used
```

### Safe: Returns C-Style String Literal
```cpp
std::string_view getBoolName(bool b)
{
    if (b) return "true";   // C-style literals live for entire program
    return "false";
}
```

### Safe: Returns std::string_view Parameter
```cpp
std::string_view firstAlphabetical(std::string_view s1, std::string_view s2)
{
    if (s1 < s2) return s1;
    return s2;
    // s1 and s2 view arguments that still exist in caller scope
}
```

> **Warning**: If an argument is a temporary, the returned `std::string_view` must be used immediately in the same expression.

---

## View Modification Functions

These modify the view only — the underlying string is unchanged.

| Function | Effect |
|---|---|
| `remove_prefix(n)` | Removes `n` characters from the left of the view |
| `remove_suffix(n)` | Removes `n` characters from the right of the view |

```cpp
std::string_view str{ "Peach" };
str.remove_prefix(1);   // "each"
str.remove_suffix(2);   // "ea"
str = "Peach";          // reset by reassigning
```

```
"Peach"
 ┌─┬─┬─┬─┬─┐
 │P│e│a│c│h│
 └─┴─┴─┴─┴─┘
  ▲         ▲
  remove_prefix(1) ──▶ view starts at 'e'
              remove_suffix(2) ──▶ view ends before 'c'
Result: "ea"
```

---

## Null-Termination

```
┌──────────────────────────────────────────────────┐
│ "snowball\0"   (C-style string literal)           │
│  s n o w b a l l \0                              │
│  ▲             ▲                                  │
│  │             └── always null-terminated         │
│                                                   │
│  std::string_view viewing "now" (substring):      │
│  s [n o w] b a l l \0                            │
│    ▲       ▲                                      │
│    └───────┘  NOT null-terminated                 │
└──────────────────────────────────────────────────┘
```

- C-style string literals: always null-terminated
- `std::string`: always null-terminated
- `std::string_view`: **may or may not be** null-terminated

> **Rule**: Never write code that assumes a `std::string_view` is null-terminated.
> **Tip**: Convert to `std::string` if a null-terminated string is required.

---

## When to Use Each Type

### Variables
| Use | When |
|---|---|
| `std::string` | Need to modify string; storing user input; storing `std::string` return value |
| `std::string_view` | Read-only view of existing string that outlives the view; symbolic constant for C-style string |

### Function Parameters
| Use | When |
|---|---|
| `std::string_view` | Read-only string needed; works with non-null-terminated strings *(preferred)* |
| `std::string` | Function must modify string without affecting caller |
| `const std::string&` | C++14 or older; calling functions requiring `const std::string&` |
| `std::string&` | Out-parameter |

### Return Types
| Use | When |
|---|---|
| `std::string` | Returning local `std::string` or result of expression returning `std::string` by value |
| `std::string_view` | Returning C-style literal or `std::string_view` parameter |
| `const std::string&` | Returning `const std::string` member accessor or `static const std::string` |

---

## Key Reminders

**std::string**
- Initialization and copying are expensive — avoid unnecessary copies
- Avoid passing by value
- Modifying a `std::string` invalidates all views into it
- Safe to return local `std::string` by value

**std::string_view**
- Cheap to create; does not own its data
- Setting to a C-style string literal is always safe
- When the viewed string is destroyed, all views are invalidated
- Using an invalidated view (without revalidation) causes undefined behavior
- May or may not be null-terminated

---

# Chapter 5 Summary — Constants, Strings, and Numeral Systems

## Constants

• **Constant**: a value that may not be changed during program execution
• **Named constant**: a constant value associated with an identifier
• **Literal constant**: a constant value not associated with an identifier
• **Constant variable**: a variable whose value cannot be changed; declared with `const`

```cpp
const int maxSpeed { 100 };   // constant variable; must be initialized
```

**Rules:**
- Constant variables must be initialized at declaration
- Avoid `const` when passing by value or returning by value

• **Type qualifier**: a keyword applied to a type that modifies its behavior (`const`, `volatile`)

---

## Compile-Time vs Runtime Constants

• **Constant expression**: an expression that can be fully evaluated at compile-time
• **Runtime expression**: an expression that is not a constant expression
• **Compile-time constant**: a constant whose value is known at compile-time
• **Runtime constant**: a constant whose initialization value is not known until runtime
• **`constexpr` variable**: must be a compile-time constant, initialized with a constant expression

```cpp
constexpr int sides { 6 };        // compile-time constant ✓
const int rolls { getUserInput() }; // runtime constant — cannot be constexpr
```

**Gotcha:** Function parameters cannot be `constexpr`.

---

## `const`/`constexpr` vs `#define`

```
┌─────────────────────┬──────────────┬────────────────┐
│ Property            │ #define      │ const/constexpr│
├─────────────────────┼──────────────┼────────────────┤
│ Visible in debugger │ No           │ Yes            │
│ Naming conflicts    │ More likely  │ Less likely    │
│ Type safety         │ No           │ Yes            │
│ Scoped              │ No           │ Yes            │
└─────────────────────┴──────────────┴────────────────┘
```

Prefer `const`/`constexpr` over `#define` for symbolic constants.

---

## Literals

• **Literal**: a value inserted directly into the code; has a default type
• **Literal suffix**: changes the type of a literal from its default

```cpp
5       // int
5u      // unsigned int
5.0     // double
5.0f    // float
5ll     // long long
```

• **Magic number**: a literal with an unclear meaning or that may need to change later

```cpp
// Bad
if (age >= 16) { ... }

// Good
constexpr int drivingAge { 16 };
if (age >= drivingAge) { ... }
```

---

## Numeral Systems

• **Decimal**: base 10 (digits 0–9); everyday counting
• **Binary**: base 2 (digits 0–1); native to computers
• **Octal**: base 8 (prefix `0`)
• **Hexadecimal**: base 16 (prefix `0x`); digits 0–9, A–F

```cpp
int dec { 255 };    // decimal
int hex { 0xFF };   // hexadecimal
int oct { 0377 };   // octal
int bin { 0b11111111 }; // binary (C++14)
```

---

## Strings

• **String**: a collection of sequential characters representing text
• **C-style string literal**: placed between double quotes; difficult to work with directly

```cpp
"Hello, world!"   // C-style string literal
```

---

## `std::string`

- Lives in `<string>`
- Modifiable, easy, and safe
- **Expensive** to initialize, assign, and copy

```cpp
#include <string>
std::string name { "Alice" };
std::getline(std::cin >> std::ws, name); // read full line including spaces
```

---

## `std::string_view`

- Lives in `<string_view>`
- Read-only view into an existing string (no copy made)
- **Inexpensive** to initialize and copy
- Accepts C-style literals, `std::string`, or char arrays

```cpp
#include <string_view>
std::string_view sv { "Hello" };   // views a C-style literal
```

• **Dangling view**: a `std::string_view` viewing a string that has been destroyed
• **Invalidated view**: a `std::string_view` whose underlying `std::string` has been modified

```
┌──────────────────────────────────────────────┐
│  std::string modified ──▶ all views INVALID  │
│  Destroyed string   ──▶ view is DANGLING     │
│  Using either       ──▶ undefined behavior   │
└──────────────────────────────────────────────┘
```

**Safe:** Returning a `std::string_view` of a C-style string literal is safe — literals exist for the entire program lifetime.

**Unsafe:** Returning a `std::string_view` of a local `std::string` is dangerous — the local string is destroyed when the function returns.

• **Substring**: a contiguous sequence of characters within an existing string

---

## `std::string` vs `std::string_view` Comparison

```
┌────────────────────┬───────────────┬──────────────────┐
│ Property           │ std::string   │ std::string_view │
├────────────────────┼───────────────┼──────────────────┤
│ Modifiable         │ Yes           │ No (read-only)   │
│ Owns its data      │ Yes           │ No               │
│ Init/copy cost     │ Expensive     │ Inexpensive      │
│ Dangling risk      │ No            │ Yes              │
│ Invalidation risk  │ No            │ Yes              │
└────────────────────┴───────────────┴──────────────────┘
```