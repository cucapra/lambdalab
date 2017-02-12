/**
 * AST for the lambda-calculus.
 */
export class Expr {}

/**
 * The variable syntax form.
 */
export class Var extends Expr {
  constructor(public name: string) {
    super();
  };
}

/**
 * The application syntax form.
 */
export class App extends Expr {
  constructor(public e1: Expr, public e2: Expr) {
    super();
  };
}

/**
 * The abstraction syntax form.
 */
export class Abs extends Expr {
  constructor(public vbl: string, public body: Expr) {
    super();
  };
}

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
