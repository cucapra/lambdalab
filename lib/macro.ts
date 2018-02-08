import { Expr, Macro } from './ast';

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