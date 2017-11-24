/**
 * AST for the lambda-calculus.
 */

/**
 * The variable syntax form.
 */
export class Var {
  kind: "var";
  constructor(public name: string) {};
}

/**
 * The application syntax form.
 */
export class App {
  kind: "app";
  constructor(public e1: Expr, public e2: Expr) {};
}

/**
 * The abstraction syntax form.
 */
export class Abs {
  kind: "abs";
  constructor(public vbl: string, public body: Expr) {};
}

/**
 * Any lambda-term.
 */
export type Expr = Var | App | Abs;

/**
 * Pretty-print a lambda-calculus expression as a string.
 */
export function pretty(e: Expr): string {
  if (e instanceof Var) {
    return e.name;
  } else if (e instanceof Abs) {
    return "λ" + e.vbl + ". " + pretty(e.body);
  } else if (e instanceof App) {

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
  throw "unknown syntax form";
}
