/**
 * Beta-reduction for lambda-terms.
 */
import { Expr, Abs, App, Var } from './ast';

/**
 * Check whether a lambda-term is a value.
 */
function is_value(e: Expr): boolean {
  return e.kind === "abs";
}

/**
 * Get the free variables in an expresison.
 */
function fv(e: Expr): ReadonlyArray<string> {
  switch (e.kind) {
  case "var":
    return [e.name];
  case "app":
    return fv(e.e1).concat(fv(e.e2) as string[]);
  case "abs":
    return fv(e.body).filter(x => x != e.vbl);
  }
}

/**
 * Create a version of the variable name x that is not
 * already present in the array.
 */
function fresh(x: string, taken: ReadonlyArray<string>) {
  let suffix = 0;
  while (taken.indexOf(x + suffix) !== -1) {
    suffix++;
  }
  return x + suffix;
}

/**
 * Perform capture-avoiding substitution: e[v/x].
 */
function subst(e: Expr, v: Expr, x: string): Expr {
  switch (e.kind) {
  case "var":
    if (e.name === x) {
      return v;
    } else {
      return e;
    }

  case "app":
    return new App(subst(e.e1, v, x), subst(e.e2, v, x));

  case "abs":
    if (e.vbl === x) {
      // Bound here.
      return e;
    } else {
      let freevars = fv(v);
      if (freevars.indexOf(e.vbl) === -1) {
        // Bound variable not free in v.
        return new Abs(e.vbl, subst(e.body, v, x));
      } else {
        // Rename the newly-bound variable.
        let y = fresh(e.vbl, freevars);
        let body = subst(e.body, new Var(y), e.vbl);
        return new Abs(y, body);
      }
    }
  }
}

/**
 * Perform a single call-by-value beta-reduction on the expression. If the
 * expression cannot take a step, return null instead.
 */
export function reduce(e: Expr): Expr | null {
  // Only applications can step.
  if (!(e.kind === "app")) {
    return null;
  }

  // Try a step on the left.
  let lhs = reduce(e.e1);
  if (lhs) {
    return new App(lhs, e.e2);
  }

  // Try a step on the right.
  let rhs = reduce(e.e2);
  if (rhs) {
    return new App(e.e1, rhs);
  }

  // Let's do the time warp again.
  if (e.e1.kind === "abs") {
    return subst(e.e1.body, e.e2, e.e1.vbl);
  }

  return null;
}
