import { Abs, Var, App, Expr, Macro } from './ast';
import { Strategy, reduce_appl, reduce_cbn, reduce_cbv, reduce_normal } from './reduce';
import { Scanner, is_closed } from './parse';

export type MacroLibrary =  {[name : string] : MacroDefinition}

/** 
 * A definition for macros that includes values for each evaluation strategy
 */
export class MacroDefinition {
    constructor(public name: string, public cbv_val : Expr | null,
      public cbn_val :  Expr | null, public full_val :  Expr | null,
      public unreduced : Expr) {}
}

/**
 * Checks if two closed terms are alpha equivalent. 
 * If either term is open, returns false
 */
export function alpha_equivalent (ex1 : Expr, ex2: Expr) : boolean {
  let alpha_equiv_in_context = function (e1 : Expr, vars1 : string[], 
                                         e2: Expr, vars2 : string[]) : boolean {
    if (e1.kind === "var" && e2.kind === "var") {
      return vars1.lastIndexOf(e1.name) === vars2.lastIndexOf(e2.name);
    } else if (e1.kind === "app" && e2.kind === "app") {
      return alpha_equiv_in_context(e1.e1, vars1, e2.e1, vars2) &&
             alpha_equiv_in_context(e1.e2, vars1, e2.e2, vars2);
    } else if (e1.kind === "abs" && e2.kind === "abs") {
      // Keeps track of when variable was most recently abstracted based on 
      // position in array
      let newvars1 = vars1.slice(); newvars1.push(e1.vbl);
      let newvars2 = vars2.slice(); newvars2.push(e2.vbl)
      return alpha_equiv_in_context(e1.body, newvars1, e2.body, newvars2);
    } else if (e1.kind === "macro" && e2.kind === "macro") {
      // Macros are closed, so we reset the contexts
      return alpha_equiv_in_context(e1.body, [], e2.body, []);
    }
    // Clearly terms with different structures are not alpha-equivalent
    return false;
  };

  return is_closed(ex1) && is_closed(ex2) && alpha_equiv_in_context(ex1, [], ex2, []);
}

/**
 * Replaces a term containing macros with an equivalent term without macros
 */
function replace_macros (e : Expr, sigma : MacroLibrary) : Expr {
  switch(e.kind) {
    case "var": return new Var(e.name);
    case "app": return new App(replace_macros(e.e1, sigma), replace_macros(e.e2, sigma));
    case "abs": return new Abs(e.vbl, replace_macros(e.body, sigma));
    case "macro": return replace_macros(e.body, sigma);
  }
}

/**
 * Determines if two terms are macro-equivalent under alpha-equivalence
 */
function equiv_a (e1 : Expr, e2 : Expr, sigma : MacroLibrary) : boolean {
  return alpha_equivalent(replace_macros(e1, sigma), replace_macros(e2, sigma));
}

/** 
 * Determines if two terms are macro-equivalent under Strategy s
 */
function equiv_s (e1 : Expr | null, e2 : Expr | null, sigma : MacroLibrary, s : Strategy,
                 timeout : number) : boolean {
  if (!e1 || !e2) {
    return false;
  }

  let strategy;
  switch(s) {
    case Strategy.Normal: strategy = reduce_normal; break;
    case Strategy.CBV: strategy = reduce_cbv; break;
    case Strategy.CBN: strategy = reduce_cbn; break;
    case Strategy.Appl: strategy = reduce_appl; break;
    default: return false;
  }

  e1 = replace_macros(e1, sigma);
  e2 = replace_macros(e2, sigma);

  // Find a normal form for e1
  for (let i = 0; i <= timeout; ++i) {
    // Take a step, if possible.
    let [next_e1, _] = strategy(e1);
    if (!next_e1) {
      break;
    }
    e1 = next_e1;
    if (i === timeout) return false; // Give up here
  }

  // Find a normal form for e2
  for (let i = 0; i <= timeout; ++i) {
    // Take a step, if possible.
    let [next_e2, _] = strategy(e2);
    if (!next_e2) {
      break;
    }
    e2 = next_e2;
    if (i === timeout) return false; // Give up here
  }

  return alpha_equivalent(e1, e2);
}

function in_library(e : Expr, sigma : MacroLibrary, s : Strategy, 
                    timeout : number) : Macro | null {
  // if e is already a macro, don't change anything
  if(e.kind === "macro") return null;
  
  for (let name in sigma) {
    switch (s) {
      case Strategy.CBN:
        if (equiv_s(e, sigma[name].cbn_val, sigma, s, timeout) || 
            equiv_s(e, sigma[name].full_val, sigma, Strategy.Normal, timeout)) {
          // If it passes this test then one of these is not null
          return (sigma[name].cbn_val) ? new Macro(name, sigma[name].cbn_val!) :  
                                         new Macro(name, sigma[name].full_val!);
        } else break;

      case Strategy.CBV:
        if (equiv_s(e, sigma[name].cbv_val, sigma, s, timeout) || 
            equiv_s(e, sigma[name].full_val, sigma, Strategy.Normal, timeout)) {
          return (sigma[name].cbv_val) ? new Macro(name, sigma[name].cbv_val!) :  
                                         new Macro(name, sigma[name].full_val!);
        } else break;

      case Strategy.Normal:
        if (equiv_s(e, sigma[name].full_val, sigma, s, timeout)) {
          return new Macro (name, sigma[name].full_val!);
        } else break;

      case Strategy.Appl:
        if (equiv_s(e, sigma[name].full_val, sigma, s, timeout) || 
            equiv_s(e, sigma[name].full_val, sigma, Strategy.Normal, timeout)) {
          return new Macro(name, sigma[name].full_val!);
        } else break;
    }
  }
  // No Match found
  return null;
}

/**
 * Attempts to resugar an expression to a Macro defined in the library. The function
 * searches all closed subterms of the input, attempting to replace the term with a macro. 
 * The search occurs in breadth-first order, so largest or outermost terms are resugared
 * before inner terms contained inside them. 
 * 
 * Terms are compared using alpha-equivalence, first attempting
 * to find a common normal form between the input expression and the macro. If no normal form
 * is found, the psuedo normal form appropriate to the current evaluation strategy will be 
 * used.  
 * 
 * Returns the most resugared possible expression. If resugaring cannot happen, then
 * this will return the original e. However, the boolean part of the pair indicates
 * whether any changes took place
 */
export function resugar(e : Expr, sigma : MacroLibrary, s : Strategy) : [Expr, boolean] {
    // Check if the whole expression is equivalent to a macro
    let mac = in_library(e, sigma, s, 30);
    if (mac) return [mac, true];

    // Otherwise walk the tree
    switch(e.kind) {
      case "var":
        return [e, false]; // macros are closed, so they won't ever be just variables
      case "app":
        let [new_e1, e1_change] = resugar(e.e1, sigma, s);
        let [new_e2, e2_change] = resugar(e.e2, sigma, s);
        return [new App(new_e1, new_e2), e1_change || e2_change];
      case "abs":
        let [new_e, e_change] = resugar(e.body, sigma, s)
        return [new Abs(e.vbl, new_e), e_change];
      case "macro":
        return [e, false];
    }
}

/**
 * Compares two macros. m1 <= m2 if m2 uses m1 in its definition
 */

export function compareMacro(m1 : MacroDefinition, m2 : MacroDefinition) : number {
  function dependsExpr (e : Expr, name : string) : boolean {
    if (e.kind === "macro") {
      return name === e.name;
    } else if (e.kind === "app") {
      return dependsExpr(e.e1, name) || dependsExpr(e.e2, name);
    } else if (e.kind === "abs") {
      return dependsExpr(e.body, name);
    } else {
      return false;
    }
  }
  if (dependsExpr(m1.unreduced, m2.name)) {
    return -1;
  } else if (dependsExpr(m2.unreduced, m1.name)) {
    return 1;
  }
  return 0;
}

/**
 * Initialize the scanner to contain a number of pre-defined macros that will probably
 * be nice to have. 
 * 
 * TODO: Not all of these are in normal form
 */

export function init_macros(s : Scanner) : void {
    // ID := λx.x
    let id = new Abs("x", new Var("x"));
    s.macro_lookup["ID"] = new MacroDefinition("ID", null, null, id, id); 
  
    // SUCC := λn. λf. λx. f (n f x)
    let succ = new Abs("n", new Abs("f", new Abs("x", new App(new Var("f"),  
                new App(new App(new Var("n"), new Var("f")), new Var("x"))))));
    s.macro_lookup["SUCC"] = new MacroDefinition("SUCC", null, null, succ, succ); 
    // ZERO := λf. λx. x
    let zero = new Abs("f", new Abs("x", new Var("x")));
    s.macro_lookup["ZERO"] = new MacroDefinition("ZERO", null, null, zero, zero);
    // ONE  := λf. λx. f x
    let one = new Abs("f", new Abs("x", new App(new Var("f"), new Var("x"))));
    s.macro_lookup["ONE"] = new MacroDefinition("ONE", null, null, one, one);
    // PLUS := λm. λn. n SUCC m
    let plus = new Abs("m", new Abs("n", new App(new App(new Var("n"), 
                new Macro("SUCC", s.macro_lookup["SUCC"].full_val!)), 
                new Var("m"))));
    s.macro_lookup["PLUS"] = new MacroDefinition("PLUS", null, null, plus, plus);
    // MULT := λm.λn. m (PLUS n) 0
    let mult = new Abs("m", new Abs ("n", new App(new App(new Var("m"), 
      new App(s.macro_lookup["PLUS"].full_val!, new Var("n"))), 
      s.macro_lookup["ZERO"].full_val!)));
    s.macro_lookup["MULT"] = new MacroDefinition("MULT", null, null, mult, mult);
    // PRED := λn.λf.λx.((n (λg.λh.h (g f))) (λu.x)) (λu.u)
    let pred = new Abs("n", new Abs("f", new Abs("x", 
      new App(new App(new App(new Var("n"), new Abs("g", new Abs("h", 
      new App(new Var("h"), new App(new Var("g"), new Var("f")))))), 
      new Abs("u", new Var("x"))), s.macro_lookup["ID"].full_val!))));
    s.macro_lookup["PRED"] = new MacroDefinition("PRED", null, null, pred, pred);
    // SUB := λm.λn.n PRED m
    let sub = new Abs("m", new Abs("n", new App(new App(new Var("n"), 
      new Macro("PRED", s.macro_lookup["PRED"].full_val!)), new Var("m"))));
    s.macro_lookup["SUB"] = new MacroDefinition("SUB", null, null, sub, sub);
  
    // TRUE := λa. λb. a
    let tr = new Abs("a", new Abs("b", new Var("a")));
    s.macro_lookup["TRUE"] = new MacroDefinition("TRUE", null, null, tr, tr);
    // FALSE := λa. λb. b
    let fl = new Abs("a", new Abs("b", new Var("b")));
    s.macro_lookup["FALSE"] = new MacroDefinition("FALSE", null, null, fl, fl);
  }