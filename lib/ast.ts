/**
 * AST for the lambda-calculus.
 */

/**
 * The variable syntax form.
 */
export class Var {
  kind: "var";
  constructor(
    public readonly name: string
  ) {
    this.kind = "var";
  };
}

/**
 * The application syntax form.
 */
export class App {
  kind: "app";
  constructor(
    public readonly e1: Expr,
    public readonly e2: Expr
  ) {
    this.kind = "app";
  };
}

/**
 * The abstraction syntax form.
 */
export class Abs {
  kind: "abs";
  constructor(
    public readonly vbl: string,
    public readonly body: Expr
  ) {
    this.kind = "abs";
  };
}

/**
 * The macro syntax form. Macros must be closed
 */
export class Macro {
  kind: "macro";
  constructor(
    public readonly name: string,
    public readonly body: Expr
  ) {
    this.kind = "macro";
  };
}

/**
 * Any lambda-term.
 */
export type Expr = Var | App | Abs | Macro;

/**
 * Pretty-print a lambda-calculus expression as a string.
 */
export function pretty(e: Expr): string {
  switch (e.kind) {
  case "var":
    return e.name;

  case "abs":
    return "λ" + e.vbl + ". " + pretty(e.body);
  
  case "macro":
    return e.name;
    
  case "app":
    // Parenthesize abstractions on the left.
    let lhs = pretty(e.e1);
    if (e.e1 instanceof Abs) {
      lhs = "(" + lhs + ")";
    }

    // Parenthesize applications and abstractions on the right.
    let rhs = pretty(e.e2);
    if (e.e2 instanceof App || e.e2 instanceof Abs) {
      rhs = "(" + rhs + ")";
    }

    return lhs + " " + rhs;
  }
}
