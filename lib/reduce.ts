/**
 * Beta-reduction for lambda-terms.
 */
import { Expr, Abs, App, Var } from './ast';

/**
 * Check whether a lambda-term is a value.
 */
function is_value(e: Expr): boolean {
  return e instanceof Abs;
}

/**
 * Perform capture-avoiding substitution.
 */
function subst(e: Expr, v: Expr, x: string): Expr {
  if (e instanceof Var) {
    if (e.name === x) {
      return v;
    } else {
      return e;
    }

  } else if (e instanceof App) {
    return new App(subst(e.e1, v, x), subst(e.e2, v, x));

  } else if (e instanceof Abs) {
    return "tk";

  }

  throw "unreachable";
}

/**
 * Perform a single call-by-value beta-reduction on the expression. If the
 * expression cannot take a step, return null instead.
 */
export function reduce(e: Expr): Expr | null {
  // Only applications can step.
  if (!(e instanceof App)) {
    return null;
  }

  if (e.e1 instanceof Abs && is_value(e.e2)) {
    // Value applied to value: substitute.
    return subst(e.e1, e.e2, e.e1.vbl);
  } else if (!(e.e1 instanceof Abs)) {
    // LHS is not yet a value; step it if possible.
    let lhs = reduce(e.e1);
    if (lhs === null) {
      return null;
    }
    return new App(lhs, e.e2);
  } else {
    // LHS is a value, but the RHS is not. Step the RHS.
    let rhs = reduce(e.e2);
    if (rhs === null) {
      return null;
    }
    return new App(e.e1, rhs);
  }
}
