/**
 * Beta-reduction for lambda-terms.
 */
import { pretty, Expr, Abs, App, Var, Macro } from './ast';

export enum Strategy {
  CBV = 1, 
  CBN = 2,
  Normal = 3,
  Appl = 4
}

export function strat_of_string(s : string) : Strategy | null {
  switch(s) {
    case "cbv" : return Strategy.CBV;
    case "cbn" : return Strategy.CBN;
    case "normal" : return Strategy.Normal;
    case "appl" : return Strategy.Appl;
    default: return null;
  }
}

/**
 * Check whether a lambda-term is a value. Only works for CBV/CBN and
 * does not account for macros. 
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
  case "macro":
    return [];
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
        return new Abs(y, subst(body, v, x));
      }
    }
  case "macro":
    //Don't substitute into macros because they are closed
    return e;
  }
}

/**
 * Perform a single call-by-value beta-reduction on the expression. If the
 * expression cannot take a step, return null instead.
 */
export function reduce_cbv(e: Expr): Expr | null {
  // Only applications can step.
  if (!(e.kind === "app")) {
    return null;
  }

  // Try a step on the left.
  let lhs = reduce_cbv(e.e1);
  if (lhs) {
    return new App(lhs, e.e2);
  }

  // Try a step on the right.
  let rhs = reduce_cbv(e.e2);
  if (rhs) {
    return new App(e.e1, rhs);
  }

  if (e.e1.kind === "macro") {
    return new App(e.e1.body, e.e2);
  }

  // Expand macros on the right hand side if they are applications (expressions that can 
  // step), as this indicates that they need to be expanded for correct CBV evaluation
  if (e.e2.kind === "macro") {
    if(e.e2.body.kind === "app") {
      return new App(e.e1, e.e2.body);
    }
  }

  // Let's do the time warp again.
  if (e.e1.kind === "abs") {
    return subst(e.e1.body, e.e2, e.e1.vbl);
  }

  return null;
}

/**
 * Perform a single call-by-name beta-reduction on the expression. If the
 * expression cannot take a step, return null instead.
 */
export function reduce_cbn(e: Expr): Expr | null {
  if (!(e.kind === "app")) {
    return null;
  }

  // Call-by-name differs from Call-by-value only in that it does
  // try to reduce the rhs before substituting it into the left
  let lhs = reduce_cbn(e.e1);
  if (lhs) {
    return new App(lhs, e.e2);
  }

  if (e.e1.kind === "abs") {
    return subst(e.e1.body, e.e2, e.e1.vbl);
  }

  if (e.e1.kind === "macro") {
    return new App(e.e1.body, e.e2);
  }

  return null;
}

/**
 * Perform a single normal order beta-reduction on the expression. If the
 * expression cannot take a step, return null instead. 
 */
export function reduce_normal(e: Expr): Expr | null {
  // Normal order reduces under lambdas
  if (e.kind === "abs") {
    let body = reduce_appl(e.body);
    if (body)
      return new Abs(e.vbl, body);
  }

  if (e.kind === "app") {
    if (e.e1.kind === "app") {
      let lhs = reduce_appl(e.e1);
      if (lhs) {
        return new App(lhs, e.e2);
      }
    }

    if (e.e1.kind === "abs") {
      return subst(e.e1.body, e.e2, e.e1.vbl);
    }

    if (e.e1.kind === "macro") {
      return new App(e.e1.body, e.e2);
    }

    if (e.e2.kind === "macro") {
      if(e.e2.body.kind === "app") {
        return new App(e.e1, e.e2.body);
      }
    }

    // This ensures we eventually get to all redexes
    let rhs = reduce_appl(e.e2);
    if (rhs) {
      return new App(e.e1, rhs);
    }
  }

  return null;
}

/**
 * Perform a single applicative order beta-reduction on the expression. If the
 * expression cannot take a step, return null instead. 
 */
export function reduce_appl(e: Expr): Expr | null {
  // Applicative order reduces under lambdas
  if (e.kind === "abs") {
    let body = reduce_appl(e.body);
    if (body)
      return new Abs(e.vbl, body);
    return null;
  }

  // As call-by-name, but with an attempt to reduce the rhs iff there 
  // is nothing to reduce or subsitute on the left
  if (e.kind === "app") {

    let lhs = reduce_appl(e.e1);
    if (lhs) {
      return new App(lhs, e.e2);
    }

    if (e.e1.kind === "abs") {
      let body = reduce_appl(e.e1.body);
      if (body)
        return new App(new Abs(e.e1.vbl, body), e.e2);
      return subst(e.e1.body, e.e2, e.e1.vbl);
    }

    if (e.e1.kind === "macro") {
      return new App(e.e1.body, e.e2);
    }

    if (e.e2.kind === "macro") {
      if(e.e2.body.kind === "app") {
        return new App(e.e1, e.e2.body);
      }
    }

    // This ensures we eventually get to all redexes
    let rhs = reduce_appl(e.e2);
    if (rhs) {
      return new App(e.e1, rhs);
    }
  }

  return null;
}

export function run(expr : Expr | null, timeout : number, 
  reduce : (e: Expr) => Expr | null) : string[] {
    
  let steps: string[] = [];

  if (!expr) {
    return steps;
  }

  for (let i = 0; i < timeout; ++i) {
    steps.push(pretty(expr));

    // Take a step, if possible.
    let next_expr = reduce(expr);
    if (!next_expr) {
      break;
    }
    expr = next_expr;
  }

  return steps;
}