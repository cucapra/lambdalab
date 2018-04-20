/**
 * Beta-reduction for lambda-terms.
 */
import { pretty, Expr, Abs, App, Var, Macro, StepInfo } from './ast';

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
  case "flat":
    throw "fv may not be performed on a flattened expression"
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
 * Perform capture-avoiding substitution: e[v/x]. Returns the new expressions, as well as pointers to all
 * the substituted expressions
 */
function subst(e: Expr, v: Expr, x: string): [Expr, Expr[]] {
  switch (e.kind) {
  case "var":
    if (e.name === x) {
      let subst = v.copy();
      return [subst, [subst]];
    } else {
      return [e, []];
    }

  case "app":
    let [res1, subst1] = subst(e.e1, v, x);
    let [res2, subst2] = subst(e.e2, v, x);
    return [new App(res1, res2), subst1.concat(subst2)];

  case "abs":
    if (e.vbl === x) {
      // Bound here.
      return [e, []];
    } else {
      let freevars = fv(v);
      if (freevars.indexOf(e.vbl) === -1) {
        // Bound variable not free in v.
        let [res, substs] = subst(e.body, v, x);
        return [new Abs(e.vbl, res), substs];
      } else {
        // Rename the newly-bound variable.
        let y = fresh(e.vbl, freevars);
        let [body, _] = subst(e.body, new Var(y), e.vbl);
        let [res, substs] = subst(body, v, x);
        return [new Abs(y, res), substs];
      }
    }
  case "macro":
    //Don't substitute into macros because they are closed
    return [e,[]];
  case "flat":
    throw "subst may not be performed on a flattened expression"
  }
}

/**
 * Perform a single call-by-value beta-reduction on the expression. If the
 * expression cannot take a step, return null instead.
 */
export function reduce_cbv(e: Expr): [Expr | null, StepInfo | null] {
  // Only applications can step.
  if (!(e.kind === "app")) {
    return [null, null];
  }

  // Try a step on the left.
  let [lhs, lstep] = reduce_cbv(e.e1);
  if (lhs) {
    return [new App(lhs, e.e2), lstep];
  }

  // Try a step on the right.
  let [rhs, rstep] = reduce_cbv(e.e2);
  if (rhs) {
    return [new App(e.e1, rhs), rstep];
  }

  if (e.e1.kind === "macro") {
    return [new App(e.e1.body, e.e2), new StepInfo(false, null, null, null, e.e1, [])];
  }

  // Expand macros on the right hand side if they are applications (expressions that can 
  // step), as this indicates that they need to be expanded for correct CBV evaluation
  if (e.e2.kind === "macro") {
    if(e.e2.body.kind === "app") {
      return [new App(e.e1, e.e2.body), new StepInfo(false, null, null, null, e.e2, [])];
    }
  }

  // Let's do the time warp again.
  if (e.e1.kind === "abs") {
    let [expr, substs] = subst(e.e1.body.copy(), e.e2.copy(), e.e1.vbl);
    return [expr, new StepInfo(true, e.e1, e.e2, e.e1.vbl, null, substs)];
  }

  return [null, null];
}

/**
 * Perform a single call-by-name beta-reduction on the expression. If the
 * expression cannot take a step, return null instead.
 */
export function reduce_cbn(e: Expr): [Expr | null, StepInfo | null] {
  if (!(e.kind === "app")) {
    return [null, null];
  }

  // Call-by-name differs from Call-by-value only in that it does
  // try to reduce the rhs before substituting it into the left
  let [lhs, step] = reduce_cbn(e.e1);
  if (lhs) {
    return [new App(lhs, e.e2), step];
  }

  if (e.e1.kind === "abs") {
    let [expr, substs] = subst(e.e1.body.copy(), e.e2.copy(), e.e1.vbl);
    return [expr, new StepInfo(true, e.e1, e.e2, e.e1.vbl, null, substs)];
  }

  if (e.e1.kind === "macro") {
    return [new App(e.e1.body, e.e2), new StepInfo(false, null, null, null, e.e1, [])];
  }

  return [null, null];
}

/**
 * Perform a single normal order beta-reduction on the expression. If the
 * expression cannot take a step, return null instead. 
 */
export function reduce_normal(e: Expr): [Expr | null, StepInfo | null] {
  // Normal order reduces under lambdas
  if (e.kind === "abs") {
    let [body, step] = reduce_appl(e.body);
    if (body)
      return [new Abs(e.vbl, body), step];
  }

  if (e.kind === "app") {
    if (e.e1.kind === "app") {
      let [lhs, step] = reduce_appl(e.e1);
      if (lhs) {
        return [new App(lhs, e.e2), step];
      }
    }

    if (e.e1.kind === "abs") {
      let [expr, substs] = subst(e.e1.body.copy(), e.e2.copy(), e.e1.vbl);
      return [expr, new StepInfo(true, e.e1, e.e2, e.e1.vbl, null, substs)];
    }

    if (e.e1.kind === "macro") {
      return [new App(e.e1.body, e.e2), new StepInfo(false, null, null, null, e.e1, [])];
    }

    if (e.e2.kind === "macro") {
      if(e.e2.body.kind === "app") {
        return [new App(e.e1, e.e2.body), new StepInfo(false, null, null, null, e.e2, [])];
      }
    }

    // This ensures we eventually get to all redexes
    let [rhs, step] = reduce_appl(e.e2);
    if (rhs) {
      return [new App(e.e1, rhs), step];
    }
  }

  return [null, null];
}

/**
 * Perform a single applicative order beta-reduction on the expression. If the
 * expression cannot take a step, return null instead. Also carries info about 
 * the most recent step performed.
 */
export function reduce_appl(e: Expr): [Expr | null, StepInfo | null] {
  // Applicative order reduces under lambdas
  if (e.kind === "abs") {
    let [body, step] = reduce_appl(e.body);
    if (body)
      return [new Abs(e.vbl, body), step];
    return [null, null];
  }

  // As call-by-name, but with an attempt to reduce the rhs iff there 
  // is nothing to reduce or subsitute on the left
  if (e.kind === "app") {

    let [lhs, lstep] = reduce_appl(e.e1);
    if (lhs) {
      return [new App(lhs, e.e2), lstep];
    }

    if (e.e1.kind === "abs") {
      let [body, step] = reduce_appl(e.e1.body);
      if (body)
        return [new App(new Abs(e.e1.vbl, body), e.e2), step];
      let [expr, substs] = subst(e.e1.body.copy(), e.e2.copy(), e.e1.vbl);
      return [expr, new StepInfo(true, e.e1, e.e2, e.e1.vbl, null, substs)];
    }

    if (e.e1.kind === "macro") {
      return [new App(e.e1.body, e.e2), new StepInfo(false, null, null, null, e.e1, [])];
    }

    if (e.e2.kind === "macro") {
      if(e.e2.body.kind === "app") {
        return [new App(e.e1, e.e2.body), new StepInfo(false, null, null, null, e.e2, [])];
      }
    }

    // This ensures we eventually get to all redexes
    let [rhs, rstep] = reduce_appl(e.e2);
    if (rhs) {
      return [new App(e.e1, rhs), rstep];
    }
  }

  return [null, null];
}

/**
 * Produces the correct string label from a StepInfo object
 */

function getLabel(step : StepInfo | null): string {
  if(!step) return "\xa0\xa0";
  if(step.beta) return "→";
  else return "=";
}

/**
 * Return the result of running the expr with a given reduction strategy, with a 
 * matching list of labels for each reduction step (= or →)
 * Also returns the final expression for resugaring purposes.
 */
export function run(expr : Expr | null, timeout : number, 
  reduce : (e: Expr) => [Expr | null, StepInfo | null]) : [string, Expr, StepInfo | null][] {
    
  let data : [string, Expr, StepInfo | null][] = [];
  let step = null;

  if (!expr) {
    return [];
  }

  for (let i = 0; i <= timeout; ++i) {
    let out = getLabel(step) + "\xa0\xa0\xa0";

    // Take a step, if possible.
    let [next_expr, next_step] = reduce(expr);
    if (!next_expr) {
      data.push([out + pretty(expr, null), expr, next_step]);
      break;
    }
    // color expr according to next step taken
    data.push([out + pretty(expr, next_step), expr, next_step]);
    if (i === timeout)  return data; // Timed out
    expr = next_expr;
    step = next_step;
  }

  return data;
}