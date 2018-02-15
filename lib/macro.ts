import { Abs, Var, App, Expr, Macro } from './ast';
import { Scanner } from './parse';

/** 
 * A definition for macros that includes values for each evaluation strategy
 */
export class MacroDefinition {
    constructor(public name: string, public cbv_val : Expr | null,
      public cbn_val :  Expr | null, public full_val :  Expr | null,
      public unreduced : Expr) {}
}

/**
 * Attempts to resugar an expression to a Macro defined in the library. The function
 * searches all closed subterms of the input, attempting to replace the term with a macro. 
 * The search occurs in breadth-first order, so largest or outermost terms are resugared
 * before inner terms contained inside them. 
 * 
 * Terms are compared using alpha-equivalence (or De Bruijn equivalently), first attempting
 * to find a common normal form between the input expression and the macro. If no normal form
 * is found, the psuedo normal form appropriate to the current evaluation strategy will be 
 * used.  
 */
export function resugar(e : Expr, 
                        library : {[name : string] : MacroDefinition}) : Expr {
    //TODO: implement this
    
    return e;
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