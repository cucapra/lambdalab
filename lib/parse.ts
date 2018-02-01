/**
 * A very simple recursive-descent parser for the plain lambda-calculus.
 */
import { pretty, Expr, Abs, App, Var, Macro } from './ast';
import { reduce_cbv, reduce_cbn, reduce_full } from './reduce';
import { TIMEOUT } from '../lambdalab';
import { skip } from 'tape';

/**
 * A parser error.
 *
 * Errors include a human-readable message and an offset in the string
 * indicating where the error occurred.
 */
export class ParseError {
  constructor(public msg: string, public pos: number) {}
}

/** 
 * A definition for macros that includes values for each evaluation strategy
 */
export class MacroDefinition {
  constructor(public name: string, public cbv_val : Expr | null,
    public cbn_val :  Expr | null, public full_val :  Expr | null,
    public unreduced : Expr) {}
}
/**
 * A simple tokenization helper that advances an offset in a string.
 */
export class Scanner {
  public offset: number;
  public macro_lookup : {[name : string] : MacroDefinition}; 
  public str : string;

  constructor() {
    this.offset = 0;
    this.str = "";
    this.macro_lookup = {};
    init_macros(this);
  }

  set_string(s : string) {
    this.offset = 0;
    this.str = s;
  }

  /**
   * Match the regular expression at the current offset, return the match, and
   * advance the current position past the matched string. Or, if the regular
   * expression does not match here, return null.
   */
  scan(re: RegExp): string | null {
    let match = this.str.substring(this.offset).match(re);
    if (!match) {
      // No match at all.
      return null;
    } else if (match.index !== 0) {
      // Not at the beginning of the string.
      return null;
    } else {
      this.offset += match[0].length;
      return match[0];
    }
  }

  /**
   * Check whether the entire string has been consumed.
   */
  done() {
    return this.offset === this.str.length;
  }

  /**
   * Create a ParseError with the given message that refers to the current
   * source position of the parser.
   */
  error(msg: string) {
    return new ParseError(msg, this.offset);
  }
}

/**
 * Scan over any amount of whitespace.
 */
function skip_whitespace(s: Scanner): void {
  s.scan(/\s*/);
}

/**
 * Parse a variable name. Variable names are lowercase
 */
function parse_var_name(s: Scanner): string | null {
  return s.scan(/[a-z0-9]+/);
}

/**
 * Parse a macro name. Macro names are uppercase
 */
function parse_macro_name(s: Scanner): string | null {
  return s.scan(/[A-Z]+/);
}

/**
 * Parse a sequence of terms separated by whitespace: in other words,
 * a nested hierarchy of applications.
 */
function parse_expr(s: Scanner, eval_strat : string): Expr {
  skip_whitespace(s);
  let out_term = null;
  while (true) {
    let term = parse_term(s, eval_strat);

    // Could not parse a term here.
    if (!term) {
      if (out_term === null) {
        throw s.error("expected term");
      }
      return out_term;
    }

    // Accumulate the newly-parsed term.
    skip_whitespace(s);
    if (out_term === null) {
      // The first term.
      out_term = term;
    } else {
      // Stack this on as an application.
      out_term = new App(out_term, term);
    }
  }
}

/**
 * Parse a non-application expression: a variable or an abstraction, or a
 * parenthesized expression.
 */
function parse_term(s: Scanner, eval_strat : string): Expr | null {
  // Try a variable occurrence.
  let vbl = parse_var(s);
  if (vbl) {
    return vbl;
  }

  // Try a macro.
  let mac = parse_macro(s, eval_strat);
  if (mac) {
    return mac;
  }

  // Try an abstraction.
  let abs = parse_abs(s, eval_strat);
  if (abs) {
    return abs;
  }

  // Try parentheses.
  if (s.scan(/\(/)) {
    let expr = parse_expr(s, eval_strat);
    if (s.scan(/\)/)) {
      return expr;
    } else {
      throw s.error("unbalanced parentheses");
    }
  }

  // No term here.
  return null;
}

/**
 * Parse a variable occurrence.
 */
function parse_var(s: Scanner): Expr | null {
  let name = parse_var_name(s);
  if (name) {
    return new Var(name);
  } else {
    return null;
  }
}

/**
 * Parse a macro occurrence.
 */
function parse_macro(s: Scanner, eval_strat : string): Expr | null {
  let name = parse_macro_name(s);
  if (name) {
    let mac = s.macro_lookup[name];
    if (!mac) {
      throw s.error("Macro undefined");
    }

    // First try the full-beta-reduction value, since this works in all evaluation strategies,
    // as it is a normal form. 
    let expr : Expr | null = mac.full_val;
    if (!expr) {
      // If there is no normal form, check to see if there is a value in the current evaluation
      // strategy
      if (eval_strat === "cbv") {
        expr = mac.cbv_val;
      } else if (eval_strat === "cbn")  {
        expr = mac.cbn_val;
      }
      // If there is no value, or we are using full beta reduction, attempt to use the 
      // unreduced form
      else {
        expr = mac.unreduced;
      }
      if (!expr) {
        expr = mac.unreduced;
      }
    }
    return new Macro(name, expr);
  } else {
    return null;
  }
}

/**
 * Parse a lambda-abstraction.
 */
function parse_abs(s: Scanner, eval_strat : string): Expr | null {
  // Lambda.
  if (!s.scan(/\\|λ/)) {
    return null;
  }
  skip_whitespace(s);

  // Variable.
  let name = parse_var_name(s);
  if (!name) {
    throw s.error("expected variable name after lambda");
  }
  skip_whitespace(s);

  // Dot.
  if (!s.scan(/\./)) {
    throw s.error("expected dot after variable name");
  }
  skip_whitespace(s);

  // Body.
  let body = parse_expr(s, eval_strat);
  return new Abs(name, body);
}

/**
 * Initialize the scanner to contain a number of pre-defined macros that will probably
 * be nice to have. 
 * 
 * TODO: Not all of these are in normal form
 */

function init_macros(s : Scanner) : void {
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

function find_value(expr : Expr, reduce : (e: Expr) => Expr | null) 
  : [Expr | null, string[]] {
  
    let steps: string[] = [];

  if (!expr) {
    return [null, steps];
  }

  for (let i = 0; i < TIMEOUT; ++i) {
    steps.push(pretty(expr));
    // Take a step, if possible.
    let next_expr = reduce(expr);
    if (!next_expr) {
      return [expr, steps];
    }
    expr = next_expr;
  }
  // Timeout reached, no value found
  return [null, steps];
}

/*
 * Parses a macro definition and adds a new macro to the interpreter session. Expects
 * definitions of form <MACRO> ≜ <EXPR> and will throw an error if this is not satisfied.
 * Returns the expression being created as a macro
 * 
 * TODO: This only accepts macros without arguments right now
 */

export function add_macro(s: Scanner) : string[] {
  // Move scanner position to beginning of macro
  skip_whitespace(s);

  // Determine macro
  let macro_name = parse_macro_name(s);
  if(!macro_name) {
    throw s.error("Improperly formatted macro definition");
  }
  skip_whitespace(s);

  let eq = s.scan(/≜/);
  if(!eq) {
    throw s.error("Improperly formatted macro definition");
  }
  skip_whitespace(s);

  let inputStr = s.str.substring(s.str.indexOf("≜") + 1);

  // Parse macro and attempt to evaluate it under full beta reduction
  let full_expr = parse_expr(s, "full");

  let fullSteps = find_value(full_expr, reduce_full);
  if (fullSteps[0]) {
    s.macro_lookup[macro_name] = 
      new MacroDefinition(macro_name, null, null, fullSteps[0], full_expr);
    return fullSteps[1];
  }

  // No normal form, so try to find the appropriate values under cbn and cbv
  // Need to reset scanner string because it was consumed before
  s.set_string(inputStr);
  let cbn_expr = parse_expr(s, "cbn");
  s.set_string(inputStr);
  let cbv_expr = parse_expr(s, "cbv");
  let cbnSteps = find_value(cbn_expr, reduce_cbn);
  let cbvSteps = find_value(cbv_expr, reduce_cbv);
  if (cbnSteps[0]) { // CBN will always find a value if CBV does
    s.macro_lookup[macro_name] = 
      new MacroDefinition(macro_name, cbvSteps[0], cbnSteps[0], null, full_expr);
    return cbnSteps[1]; 
  }

  // No value found in any evaluation strategy, so just store the literal input
  s.macro_lookup[macro_name] = new MacroDefinition(macro_name, null, null, null, full_expr);
  return fullSteps[1];
}

/**
 * Parse the current contents of the Scanner.
 *
 * May throw a `ParseError` when the expression is not a valid term.
 */
export function parse(scanner : Scanner, eval_strat : string): Expr | null {
  let expr = parse_expr(scanner, eval_strat);
  if (scanner.offset < scanner.str.length) {
    throw scanner.error("unexpected token");
  }
  return expr;
}
