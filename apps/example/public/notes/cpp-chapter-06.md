# Chapter 06 — Notes


---

# 6.1 — Operator Precedence and Associativity

## Core Concepts

• **Operation**: a mathematical process taking zero or more **operands** and producing an output value
• **Operator**: the symbol (or symbol pair) denoting which operation to perform
• **Precedence**: the level that determines which operators bind their operands first (level 1 = highest)
• **Associativity**: the direction (L→R or R→L) used to group operators of equal precedence
• **Value computation**: execution of operators in an expression to produce a result
• **Evaluation**: the process of resolving operands to their values (distinct from value computation)

## Parsing a Compound Expression

The compiler performs two tasks:

```
┌─────────────────────────────────────────────────────────┐
│  Compile time: parse expression using precedence &      │
│  associativity → determine operand/operator grouping    │
├─────────────────────────────────────────────────────────┤
│  Compile/runtime: evaluate operands, execute operators  │
│  to produce a result                                    │
└─────────────────────────────────────────────────────────┘
```

## Precedence Rules

Higher precedence level number = lower precedence (bound last).

```
4 + 2 * 3
        │
        └─ * is level 5, + is level 6
           → * binds first → 4 + (2 * 3) → 10
```

## Associativity Rules

Used when two operators share the same precedence level.

```
7 - 4 - 1
  │   │
  └───┴─ both level 6, L→R associativity
         → (7 - 4) - 1 → 2
```

## Operator Precedence Table

| Prec | Assoc | Key Operators |
|------|-------|---------------|
| 1 | L→R | `::` |
| 2 | L→R | `()` `[]` `.` `->` `++`(post) `--`(post) casts |
| 3 | R→L | unary `+` `-` `++`(pre) `--`(pre) `!` `~` `*` `&` `new` `delete` `sizeof` |
| 4 | L→R | `->*` `.*` |
| 5 | L→R | `*` `/` `%` |
| 6 | L→R | `+` `-` |
| 7 | L→R | `<<` `>>` |
| 8 | L→R | `<=>` |
| 9 | L→R | `<` `<=` `>` `>=` |
| 10 | L→R | `==` `!=` |
| 11 | L→R | `&` |
| 12 | L→R | `^` |
| 13 | L→R | `\|` |
| 14 | L→R | `&&` |
| 15 | L→R | `\|\|` |
| 16 | R→L | `=` `+=` `-=` `*=` `/=` `%=` `<<=` `>>=` `&=` `\|=` `^=` `?:` `throw` |
| 17 | L→R | `,` |

Note: `operator<<` and `operator>>` serve dual roles (bitwise shift / stream insertion/extraction); the compiler disambiguates by operand types. C++ has no exponentiation operator (`^` is bitwise XOR).

## Parenthesization

### General Rule

```cpp
// Ambiguous to a reader:
x && y || z

// Clear intent:
(x && y) || z
```

**Best practice**: parenthesize all non-trivial compound expressions, except routine arithmetic (`+`, `-`, `*`, `/`).

### Assignment Exception

A single assignment operator does not require parentheses around the right operand — assignment has the second-lowest precedence, so the right side fully evaluates first.

```cpp
x = (y + z + w);     // unnecessary parens
x =  y + z + w;      // fine

x = ((y || z) && w); // unnecessary outer parens
x =  (y || z) && w;  // fine

x = (y *= z);        // multiple assignments: parens still help
```

## Order of Operand Evaluation

**Precedence and associativity determine grouping and value-computation order, not operand evaluation order.**

Operands, subexpressions, and function arguments may be evaluated in **any order**.

### Problematic Example

```cpp
// Order of getValue() calls is unspecified:
printCalculation(getValue(), getValue(), getValue());
// Clang: left-to-right; GCC: right-to-left → different results
```

### Fixed Version

```cpp
int a{ getValue() }; // executes first
int b{ getValue() }; // executes second
int c{ getValue() }; // executes third

printCalculation(a, b, c); // unambiguous
```

### Key Grouping vs. Evaluation Distinction

```
Expression: a * b + c * d
Grouping (precedence): (a * b) + (c * d)   ← fixed by precedence
Evaluation order of a, b, c, d             ← unspecified
```

**Warning**: never write expressions whose correctness depends on which operand (or argument) is evaluated first.

---

# 6.2 — Arithmetic Operators

## Unary Arithmetic Operators

| Operator | Symbol | Form | Operation |
|---|---|---|---|
| Unary plus | `+` | `+x` | Value of x |
| Unary minus | `-` | `-x` | Negation of x |

- **Unary minus**: returns operand × −1 (e.g., if `x = 5`, then `-x` is `-5`)
- **Unary plus**: returns operand unchanged; redundant, exists for symmetry with unary minus
- Place immediately before the operand: `-x`, not `- x`

> Gotcha: `-` is overloaded — in `x = 5 - -3;` the first `-` is binary subtraction, the second is unary minus.

---

## Binary Arithmetic Operators

| Operator | Symbol | Form | Operation |
|---|---|---|---|
| Addition | `+` | `x + y` | x plus y |
| Subtraction | `-` | `x - y` | x minus y |
| Multiplication | `*` | `x * y` | x multiplied by y |
| Division | `/` | `x / y` | x divided by y |
| Remainder | `%` | `x % y` | remainder of x / y |

---

## Division Modes

```
Operand types          → Division mode     → Result
─────────────────────────────────────────────────────
int   / int            → integer division  → fraction dropped
float / int  (or both) → floating point    → fraction kept
```

- **Floating point division**: at least one operand is a floating-point type; returns the full fractional result (e.g., `7.0 / 4 = 1.75`)
- **Integer division**: both operands are integers; fraction is truncated (e.g., `7 / 4 = 1`, `-7 / 4 = -1`)

### Using `static_cast<>` for Floating Point Division with Integers

```cpp
#include <iostream>

int main()
{
    constexpr int x{ 7 };
    constexpr int y{ 4 };

    std::cout << "int / int = "         << x / y                                          << '\n'; // 1
    std::cout << "double / int = "      << static_cast<double>(x) / y                    << '\n'; // 1.75
    std::cout << "int / double = "      << x / static_cast<double>(y)                    << '\n'; // 1.75
    std::cout << "double / double = "   << static_cast<double>(x) / static_cast<double>(y) << '\n'; // 1.75

    return 0;
}
```

Converting either operand to `double` forces floating point division.

---

## Division by Zero

| Divisor | Type | Result |
|---|---|---|
| `0` (integer) | integer division | **undefined behavior** — likely crash |
| `0.0` (float) | floating point division | implementation-defined (`NaN` or `Inf` on IEEE 754; UB elsewhere) |

---

## Arithmetic Assignment Operators

| Operator | Symbol | Form | Equivalent |
|---|---|---|---|
| Addition assignment | `+=` | `x += y` | `x = x + y` |
| Subtraction assignment | `-=` | `x -= y` | `x = x - y` |
| Multiplication assignment | `*=` | `x *= y` | `x = x * y` |
| Division assignment | `/=` | `x /= y` | `x = x / y` |
| Remainder assignment | `%=` | `x %= y` | `x = x % y` |

```cpp
x = x + 4;  // verbose form
x += 4;     // equivalent shorthand
```

---

## Modifying vs. Non-Modifying Operators

- **Non-modifying operator**: uses operands to compute and return a value without altering them (most operators)
- **Modifying operator**: alters the value of its left operand

Modifying operator categories:
```
┌─────────────────────────────────────────────────────────────────┐
│ Modifying Operators                                             │
├─────────────────────────────────────────────────────────────────┤
│ Assignment          =                                           │
│ Arithmetic assign   +=  -=  *=  /=  %=                         │
│ Bitwise assign      <<=  >>=  &=  |=  ^=                       │
│ Increment/decrement ++  --                                      │
└─────────────────────────────────────────────────────────────────┘
```

> Note: `==`, `!=`, `<=`, `>=` are **relational** (comparison) operators — the `=` means "is equal to", not assignment. They are non-modifying.

---

# 6.3 — Remainder and Exponentiation

## Remainder Operator (`operator%`)

• **Remainder operator**: returns the integer remainder after dividing two integer operands

```
7 / 4 = 1 remainder 3  →  7 % 4 = 3
25 / 7 = 3 remainder 4  →  25 % 7 = 4
```

- Only works with integer operands
- Primary use: testing even divisibility — if `x % y == 0`, then `x` is evenly divisible by `y`

```cpp
#include <iostream>

int main()
{
    std::cout << "Enter an integer: ";
    int x{};
    std::cin >> x;

    std::cout << "Enter another integer: ";
    int y{};
    std::cin >> y;

    std::cout << "The remainder is: " << x % y << '\n';

    if ((x % y) == 0)
        std::cout << x << " is evenly divisible by " << y << '\n';
    else
        std::cout << x << " is not evenly divisible by " << y << '\n';

    return 0;
}
```

**Edge case — second operand larger than first:**
When `y > x`, integer division yields 0, so `x % y == x`.
```
2 / 4 = 0 remainder 2  →  2 % 4 = 2
```

## Remainder with Negative Numbers

The result of `x % y` always carries the **sign of `x`** (the left operand).

```
-6 % 4  = -2   (sign of -6)
 6 % -4 =  2   (sign of  6)
```

### Gotcha: Comparing Remainder Against Non-Zero

```cpp
// WRONG: fails for negative odd numbers (-5 % 2 == -1, not 1)
bool isOdd(int x)
{
    return (x % 2) == 1;
}

// CORRECT: compare against 0, which has no sign ambiguity
bool isOdd(int x)
{
    return (x % 2) != 0;
}
```

> **Best practice:** Prefer comparing the result of `operator%` against `0` when possible.

### Naming Note

| Term | C++ result for `-21 % 4` |
|------|--------------------------|
| Remainder (C++ `operator%`) | `-1` |
| Modulo (mathematical) | `3` |

The C++ standard calls `operator%` the **remainder** operator — "remainder" is more accurate than "modulo" when negative operands are involved.

---

## Exponentiation

C++ has **no built-in exponent operator**. The `^` symbol is bitwise XOR, not exponentiation.

### Floating-Point Exponentiation: `std::pow`

```cpp
#include <cmath>

double x{ std::pow(3.0, 4.0) };  // 3 to the 4th power = 81.0
```

- Parameters and return type are `double`
- Floating-point rounding errors may affect precision even with integer inputs

### Integer Exponentiation: Custom Function

```cpp
#include <cassert>   // for assert
#include <cstdint>   // for std::int64_t
#include <iostream>

// note: exp must be non-negative
// note: does not perform overflow checking
constexpr std::int64_t powint(std::int64_t base, int exp)
{
    assert(exp >= 0 && "powint: exp parameter has negative value");

    if (base == 0)
        return (exp == 0) ? 1 : 0;

    std::int64_t result{ 1 };
    while (exp > 0)
    {
        if (exp & 1)       // if exp is odd
            result *= base;
        exp /= 2;
        base *= base;
    }

    return result;
}

int main()
{
    std::cout << powint(7, 12) << '\n';  // 13841287201
    return 0;
}
```

- Uses **exponentiation by squaring** for efficiency
- `constexpr` allows compile-time evaluation when used in a constant expression

### Overflow Warning

Integer exponentiation overflows its type in the vast majority of cases.

```
┌─────────────────────────────────────────────────────┐
│  std::int64_t max ≈ 9.2 × 10^18                    │
│  powint(70, 12) = 70^12 ≈ 1.38 × 10^22  → OVERFLOW │
└─────────────────────────────────────────────────────┘
```

Use `powint_safe()` (overflow-checked variant) when the result size is uncertain; it returns `std::numeric_limits<std::int64_t>::max()` on overflow and prints a diagnostic to `std::cerr`.

---

# 6.4 — Increment/Decrement Operators and Side Effects

## Increment and Decrement Operators

| Operator | Symbol | Form | Operation |
|---|---|---|---|
| Prefix increment | `++` | `++x` | Increment x, then return x |
| Prefix decrement | `--` | `--x` | Decrement x, then return x |
| Postfix increment | `++` | `x++` | Copy x, then increment x, then return the copy |
| Postfix decrement | `--` | `x--` | Copy x, then decrement x, then return the copy |

## Prefix Versions

Operand is modified first; the updated value is returned.

```cpp
int x { 5 };
int y { ++x }; // x becomes 6, y assigned 6
// x == 6, y == 6
```

## Postfix Versions

A temporary copy is made first; the original is incremented; the copy (old value) is returned.

```cpp
int x { 5 };
int y { x++ }; // copy(5) made, x becomes 6, y assigned 5
// x == 6, y == 5
```

### Execution Steps for Postfix
```
x++ evaluated:
┌─────────────────────────────────────────────┐
│ 1. Make temp copy of x  (copy = 5)          │
│ 2. Increment original x (x    = 6)          │
│ 3. Return temp copy     (returns 5)         │
│ 4. Discard temp copy                        │
└─────────────────────────────────────────────┘
```

### Comparison Example

```cpp
int x { 5 }, y { 5 };
std::cout << x   << ' ' << y   << '\n'; // 5 5
std::cout << ++x << ' ' << --y << '\n'; // 6 4  (updated values returned)
std::cout << x   << ' ' << y   << '\n'; // 6 4
std::cout << x++ << ' ' << y-- << '\n'; // 6 4  (pre-change copies returned)
std::cout << x   << ' ' << y   << '\n'; // 7 3
```

## Prefix vs Postfix: Which to Use

- **Prefer prefix** — more performant (no temporary copy), less surprising.
- **Use postfix** only when it produces significantly more concise or understandable code.

## Side Effects

• **Side effect**: an observable effect of a function or expression beyond its return value.

Common examples:
- Changing the value of an object (`x = 5`, `++x`)
- Performing I/O (`std::cout << x`)
- Updating a GUI

### Operators and Side Effects

```
┌──────────────────────────┬──────────────────────────────────┐
│ Has side effect          │ No side effect                   │
├──────────────────────────┼──────────────────────────────────┤
│ Assignment  (x = 5)      │ Arithmetic  (x + y)              │
│ Prefix ++/--             │ Comparison  (x == y)             │
│ Postfix ++/--            │ Logical     (x && y)             │
└──────────────────────────┴──────────────────────────────────┘
```

## Order of Evaluation Problems

C++ does **not** define the order in which function arguments or operator operands are evaluated.

```cpp
int x { 5 };
int value { add(x, ++x) }; // undefined behavior
// Could be add(5, 6) == 11  OR  add(6, 6) == 12
```

Similarly, operand evaluation order is unspecified:

```cpp
int x { 1 };
int y { x + ++x }; // unspecified behavior
// MSVC/GCC: 2 + 2 == 4 | Clang: 1 + 2 == 3
```

## Rules

> **Warning**: Do not use a variable that has a side effect applied to it more than once in the same statement — the result may be undefined.

> **Exception**: Simple assignment expressions like `x = x + y` (equivalent to `x += y`) are safe.

---

# 6.5 — The Comma Operator

## Operator Summary

| Operator | Symbol | Form | Operation |
|----------|--------|------|-----------|
| Comma | `,` | `x, y` | Evaluate `x` then `y`; return value of `y` |

## Behavior

• **Comma operator**: evaluates the left operand, then the right operand, and returns the result of the right operand.

```cpp
int x{ 1 };
int y{ 2 };
std::cout << (++x, ++y) << '\n'; // prints 3
// x incremented to 2, y incremented to 3, right operand (3) returned
```

## Precedence Gotcha

Comma has the **lowest precedence** of all operators — lower than assignment.

```cpp
z = (a, b);  // evaluates (a, b) → result of b → assigns to z
z = a, b;    // evaluates as (z = a), b → z gets a; b is discarded
```

## Usage

**Best practice**: avoid the comma operator except inside `for` loops.

Preferred alternative — separate statements:

```cpp
// Instead of: std::cout << (++x, ++y) << '\n';
++x;
std::cout << ++y << '\n';
```

## Comma as Separator (Not the Operator)

The comma **symbol** appears as a separator in several contexts; these do **not** invoke the comma operator:

```cpp
void foo(int x, int y)   // separator: function parameters
{
    add(x, y);           // separator: function arguments
    int z{ 3 }, w{ 5 }; // separator: multiple variable declarations (avoid this)
}
```

Separator commas require no special avoidance (except multi-variable declarations on one line, which should not be done).

---

# 6.6 — The Conditional Operator

## Overview

| Operator | Symbol | Form | Meaning |
|---|---|---|---|
| Conditional | `?:` | `c ? x : y` | If `c` is `true`, evaluate `x`; otherwise evaluate `y` |

- • **Conditional operator (`?:`)**: A ternary operator taking three operands — a condition, a true-expression, and a false-expression
- • **Ternary operator**: An operator with three operands; `?:` is C++'s only one, so they are often used synonymously

Syntax:
```cpp
condition ? expression1 : expression2;
```
The `: expression2` part is **not optional** (unlike `else` in if-else).

---

## Comparison to if-else

```cpp
// if-else form
if (x > y)
    max = x;
else
    max = y;

// Conditional operator form
max = ((x > y) ? x : y);
```

---

## Key Property: Evaluates as an Expression

The conditional operator produces a value as part of an expression, so it can appear anywhere an expression is valid — including constant expressions and initializers.

```cpp
constexpr bool inBigClassroom { false };
constexpr int classSize { inBigClassroom ? 30 : 20 }; // works
```

The equivalent if-else fails because variables defined inside `if`/`else` blocks are destroyed at the end of those blocks:

```cpp
// Does NOT work — classSize out of scope at std::cout line
if (inBigClassroom)
    constexpr int classSize { 30 };
else
    constexpr int classSize { 20 };
std::cout << classSize; // compile error: classSize undefined
```

---

## Parenthesization Rules

Most operators have **higher precedence** than `?:`, leading to unexpected evaluation order.

```
┌─────────────────────────────────────────────────────┐
│ GOTCHA: Precedence surprises                        │
│                                                     │
│ int z { 10 - x > y ? x : y };                      │
│   evaluates as: (10 - x) > y ? x : y  ← actual     │
│   NOT as:       10 - (x > y ? x : y)  ← intended   │
│                                                     │
│ std::cout << (x < 0) ? "neg" : "non-neg";           │
│   evaluates as: (std::cout << (x < 0)) ? ...        │
│   prints 0, not "non-neg"                           │
└─────────────────────────────────────────────────────┘
```

**Rules:**

1. **Parenthesize the entire conditional expression** when used inside a compound expression (one with other operators).
2. **Consider parenthesizing the condition** if it contains operators (other than function call `()`).
3. The individual operands (`expression1`, `expression2`) do not need parentheses.

```cpp
return isStunned ? 0 : movesLeft;            // ok: not compound, no operators in condition
int z { (x > y) ? x : y };                  // ok: not compound, condition has operators
std::cout << (isAfternoon() ? "PM" : "AM");  // compound: whole ?: parenthesized
std::cout << ((x > y) ? x : y);             // compound + operators in condition: both rules applied
```

---

## Type Matching Requirements

One of the following must hold for `expression1` and `expression2`:

- Their types **match**, OR
- The compiler can **implicitly convert** one or both to a common type

```cpp
(true ? 1 : 2)      // ok: both int
(false ? 1 : 2.2)   // ok: int 1 converted to double → prints 2.2
(true ? -1 : 2u)    // danger: -1 converted to unsigned int → 4294967295
```

If no common type can be found, a **compile error** results:

```cpp
// compile error: no common type for int and C-style string literal
std::cout << ((x != 5) ? x : "x is 5");
```

**Fix with explicit conversion or if-else:**

```cpp
// Explicit conversion
std::cout << ((x != 5) ? std::to_string(x) : std::string{"x is 5"}) << '\n';

// if-else alternative
if (x != 5) std::cout << x << '\n';
else        std::cout << "x is 5" << '\n';
```

> **Gotcha**: Mixing signed and unsigned operands produces surprising results due to arithmetic conversion rules. Prefer explicit casts when operands are non-fundamental types.

---

## When to Use the Conditional Operator

**Appropriate uses:**
- Initializing a variable with one of two values
- Assigning one of two values
- Passing one of two values to a function
- Returning one of two values from a function
- Printing one of two values

**Avoid** using `?:` in complicated expressions — they become error-prone and hard to read.

---

# 6.7 — Relational Operators and Floating Point Comparisons

## Relational Operators

| Operator | Symbol | Form | Result |
|---|---|---|---|
| Greater than | `>` | `x > y` | `true` if x > y |
| Less than | `<` | `x < y` | `true` if x < y |
| Greater than or equals | `>=` | `x >= y` | `true` if x ≥ y |
| Less than or equals | `<=` | `x <= y` | `true` if x ≤ y |
| Equality | `==` | `x == y` | `true` if x = y |
| Inequality | `!=` | `x != y` | `true` if x ≠ y |

All relational operators evaluate to `bool` (`true` or `false`).

## Boolean Conditions

Conditions in `if` statements and conditional operators evaluate as `bool` directly.

```cpp
// Redundant — avoid
if (b1 == true) ...
if (b1 == false) ...

// Preferred
if (b1) ...
if (!b1) ...
```

> **Rule**: Don't add unnecessary `==` or `!=` to conditions.

## Floating Point Comparisons

### The Problem

Floating point values accumulate rounding errors, making exact comparison unreliable.

```cpp
constexpr double d1{ 100.0 - 99.99 }; // mathematically 0.01
constexpr double d2{ 10.0 - 9.99 };   // mathematically 0.01
// d1 = 0.010000000000005116
// d2 = 0.0099999999999997868
// d1 == d2 evaluates to false
```

### Less-Than / Greater-Than with Floats

`<`, `>`, `<=`, `>=` are reliable when operands differ significantly; unreliable when operands are nearly equal.

### Equality / Inequality with Floats

`==` and `!=` are high-risk — even tiny rounding errors cause `==` to return `false` unexpectedly.

```cpp
std::cout << (0.3 == 0.2 + 0.1); // prints false
```

> **Warning**: Avoid `==` and `!=` with floating point values that may have been calculated.

### Safe Direct Comparison Exception

Direct comparison is safe when:
- Both operands are the **same type**
- Both are initialized from **literals**
- Significant digits don't exceed type's minimum precision

| Type | Minimum precision |
|---|---|
| `float` | 6 significant digits |
| `double` | 15 significant digits |

```cpp
if (someFcn() == 0.0) // safe if someFcn() returns literal 0.0

constexpr double gravity { 9.8 };
if (gravity == 9.8)   // safe — same type, initialized from literal
```

> Comparing literals of **different types** (e.g., `9.8f` vs `9.8`) is generally not safe.

## Approximate Equality Functions

### Absolute Epsilon (Simple, Limited)

```cpp
#include <cmath>

bool approximatelyEqualAbs(double a, double b, double absEpsilon)
{
    return std::abs(a - b) <= absEpsilon;
}
```

- • **Term**: **epsilon** — a small positive value representing "close enough" tolerance
- Problem: a fixed epsilon is too large for small magnitudes, too small for large magnitudes

### Relative Epsilon (Knuth's Algorithm)

```cpp
#include <algorithm>
#include <cmath>

bool approximatelyEqualRel(double a, double b, double relEpsilon)
{
    return (std::abs(a - b) <= (std::max(std::abs(a), std::abs(b)) * relEpsilon));
}
```

```
│ std::abs(a - b) │  <=  max(│a│, │b│) × relEpsilon
└── distance ────┘       └── scaled tolerance ──────┘
```

- Scales tolerance to the magnitude of the operands
- Fails near zero (the scaled tolerance becomes too small)

### Combined Abs+Rel (Recommended)

```cpp
#include <algorithm>
#include <cmath>

bool approximatelyEqualAbsRel(double a, double b, double absEpsilon, double relEpsilon)
{
    if (std::abs(a - b) <= absEpsilon)  // handles near-zero cases
        return true;
    return approximatelyEqualRel(a, b, relEpsilon); // Knuth for everything else
}
```

```
Input a, b
    │
    ▼
│a-b│ ≤ absEpsilon? ──yes──▶ return true
    │
    no
    │
    ▼
│a-b│ ≤ max(│a│,│b│)×relEpsilon? ──yes──▶ return true
    │
    no
    │
    ▼
return false
```

**Recommended defaults**: `absEpsilon = 1e-12`, `relEpsilon = 1e-8`

### Inequality with Approximate Comparison

```cpp
if (!approximatelyEqualRel(a, b, 0.001))
    std::cout << a << " is not equal to " << b << '\n';
```

## Constexpr Version (C++23)

In C++23, `std::abs` is `constexpr`, so the functions can be marked `constexpr` directly.

For C++14/17/20, replace `std::abs` with a custom implementation:

```cpp
template <typename T>
constexpr T constAbs(T x)
{
    return (x < 0 ? -x : x);
}
```

---

# Logical Operators

## Overview

| Operator | Symbol | Example | Operation |
|----------|--------|---------|-----------|
| Logical NOT | `!` | `!x` | `true` if x is false; `false` if x is true |
| Logical AND | `&&` | `x && y` | `true` if both x and y are true |
| Logical OR | `\|\|` | `x \|\| y` | `true` if either or both x, y are true |

---

## Logical NOT (`!`)

| Operand | Result |
|---------|--------|
| `true` | `false` |
| `false` | `true` |

Flips a Boolean value.

### Precedence Gotcha

`!` has **very high precedence** — it binds tighter than comparison operators.

```cpp
if (!x > y)      // evaluates as (!x) > y  — WRONG
if (!(x > y))    // evaluates as !(x > y)  — CORRECT
```

> **Rule:** When `!` is intended to negate the result of other operators, wrap those operators and their operands in parentheses.

---

## Logical OR (`||`)

| Left | Right | Result |
|------|-------|--------|
| false | false | false |
| false | true | true |
| true | false | true |
| true | true | true |

```cpp
if (value == 0 || value == 1)   // correct
if (value == 0 || 1)            // WRONG: right side always converts to true
```

---

## Logical AND (`&&`)

| Left | Right | Result |
|------|-------|--------|
| false | false | false |
| false | true | false |
| true | false | false |
| true | true | true |

```cpp
if (value > 10 && value < 20)   // true only if both conditions hold
```

---

## Short-Circuit Evaluation

```
┌─────────────────────────────────────────────────────┐
│  Logical AND (&&)                                   │
│  Left = false  ──▶  result = false  (right skipped) │
│  Left = true   ──▶  evaluate right                  │
├─────────────────────────────────────────────────────┤
│  Logical OR (||)                                    │
│  Left = true   ──▶  result = true   (right skipped) │
│  Left = false  ──▶  evaluate right                  │
└─────────────────────────────────────────────────────┘
```

- **Left operand always evaluates first** (exception to general unspecified evaluation order).
- **Avoid side effects** in the right operand — it may never execute.

```cpp
if (x == 1 && ++y == 2)  // ++y only runs if x == 1 — likely a bug
```

> **Warning:** Overloaded `&&` and `||` do **not** perform short-circuit evaluation.

---

## Mixing AND and OR

• **`&&` has higher precedence than `||`**

```
value1 || value2 && value3
  evaluates as: value1 || (value2 && value3)
```

> **Rule:** Always use explicit parentheses when mixing `&&` and `||`.

```cpp
// Unclear:
if (value1 && value2 || value3 && value4)

// Clear:
if ((value1 && value2) || (value3 && value4))
```

---

## De Morgan's Laws

```
!(x && y)  ≡  !x || !y
!(x || y)  ≡  !x && !y
```

When distributing `!`, flip `&&` ↔ `||`.

---

## Logical XOR

C++ has no dedicated logical XOR operator (`^` is bitwise XOR).

For `bool` operands, `!=` produces XOR behavior:

```cpp
if (a != b)          // XOR of two bools
if (a != b != c)     // XOR of three bools (true if odd number are true)
```

For non-`bool` operands, cast first:

```cpp
if (static_cast<bool>(a) != static_cast<bool>(b))
if (!!a != !!b)   // double-NOT forces bool conversion
```

---

## Alternative Operator Keywords

| Symbol | Keyword |
|--------|---------|
| `&&` | `and` |
| `\|\|` | `or` |
| `!` | `not` |

```cpp
std::cout << !a && (b || c);
std::cout << not a and (b or c);   // identical
```

Symbolic names (`&&`, `||`, `!`) are strongly preferred in practice.

---

## Chapter 6 Summary

## Operator Precedence & Parentheses
- Always parenthesize expressions when precedence is ambiguous or could cause confusion.

## Arithmetic Operators
- Work as in standard mathematics.
- `%` (remainder) returns the remainder from integer division.

## Increment / Decrement Operators
- Prefer prefix forms (`++i`, `--i`) over postfix forms (`i++`, `i--`).
- Avoid using a variable with a side effect applied more than once in the same statement.
- Function parameter evaluation order is unspecified — do not rely on it when side effects are present.

## Comma Operator
- Compresses multiple statements into one expression.
- Prefer writing statements separately for clarity.

## Conditional (Ternary) Operator
- • **Conditional operator (`?:`)**: ternary operator of the form `c ? x : y`; evaluates `x` if `c` is `true`, otherwise evaluates `y`.
- Also called the **arithmetic if** operator.

**Parenthesization rules:**
```
┌─────────────────────────────────────────────────────────────┐
│ Used in compound expression  →  parenthesize entire ?:      │
│ Condition contains operators →  parenthesize the condition  │
└─────────────────────────────────────────────────────────────┘
```

## Relational Operators
- Can compare floating-point numbers.
- Avoid `==` and `!=` with floating-point values (precision issues).

## Logical Operators
- Combine conditions to form compound conditional statements (`&&`, `||`, `!`).

## Key Patterns

### Returning `std::string_view` from string literals
```cpp
#include <string_view>

std::string_view getQuantityPhrase(int num)
{
    if (num < 0)  return "negative";
    if (num == 0) return "no";
    if (num == 1) return "a single";
    if (num == 2) return "a couple of";
    if (num == 3) return "a few";
    return "many";
}
```
- C-style string literals can be returned safely as `std::string_view`.

### Conditional operator for simple two-case return
```cpp
std::string_view getApplesPluralized(int num)
{
    return (num == 1) ? "apple" : "apples";
}
```

### Complete example
```cpp
#include <iostream>
#include <string_view>

std::string_view getQuantityPhrase(int num)
{
    if (num < 0)  return "negative";
    if (num == 0) return "no";
    if (num == 1) return "a single";
    if (num == 2) return "a couple of";
    if (num == 3) return "a few";
    return "many";
}

std::string_view getApplesPluralized(int num)
{
    return (num == 1) ? "apple" : "apples";
}

int main()
{
    constexpr int maryApples { 3 };
    std::cout << "Mary has "
              << getQuantityPhrase(maryApples) << ' '
              << getApplesPluralized(maryApples) << ".\n";

    std::cout << "How many apples do you have? ";
    int numApples{};
    std::cin >> numApples;

    std::cout << "You have "
              << getQuantityPhrase(numApples) << ' '
              << getApplesPluralized(numApples) << ".\n";

    return 0;
}
```

### `getQuantityPhrase` mapping
```
┌──────────┬──────────────┐
│ Value    │ Returns      │
├──────────┼──────────────┤
│ < 0      │ "negative"   │
│ 0        │ "no"         │
│ 1        │ "a single"   │
│ 2        │ "a couple of"│
│ 3        │ "a few"      │
│ > 3      │ "many"       │
└──────────┴──────────────┘
```