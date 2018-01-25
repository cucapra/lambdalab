/**
 * A very simple recursive-descent parser for the plain lambda-calculus.
 */
import { Expr, Abs, App, Var, Macro } from './ast';

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
 * A simple tokenization helper that advances an offset in a string.
 */
class Scanner {
  public offset: number;
  public macro_lookup : {[name : string] : Abs}; 

  constructor(public str: string) {
    this.offset = 0;
    this.macro_lookup = {};
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
function parse_expr(s: Scanner): Expr {
  skip_whitespace(s);
  let out_term = null;
  while (true) {
    let term = parse_term(s);

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
function parse_term(s: Scanner): Expr | null {
  // Try a variable occurrence.
  let vbl = parse_var(s);
  if (vbl) {
    return vbl;
  }

  // Try a macro.
  let mac = parse_macro(s);
  if (mac) {
    return mac;
  }

  // Try an abstraction.
  let abs = parse_abs(s);
  if (abs) {
    return abs;
  }

  // Try parentheses.
  if (s.scan(/\(/)) {
    let expr = parse_expr(s);
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
function parse_macro(s: Scanner): Expr | null {
  let name = parse_macro_name(s);
  if (name) {
    // TODO: obtain the relevant abstraction from the macro lookup table
    let abs = s.macro_lookup[name];
    if (!abs) {
      throw s.error("Undefined macro name")
    }
    return new Macro(name, abs);
  } else {
    return null;
  }
}

/**
 * Parse a lambda-abstraction.
 */
function parse_abs(s: Scanner): Expr | null {
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
  let body = parse_expr(s);
  return new Abs(name, body);
}

/**
 * Initialize the scanner to contain a number of pre-defined macros that will probably
 * be nice to have. 
 * 
 * // TODO: It would be nicer to have this in a config file at some point  
 * // TODO: There is currently no way to allow users to expand this list of macros
 */

function init_macros(s : Scanner) : void {
  // SUCC := λn. λf. λx. f (n f x)
  s.macro_lookup["SUCC"] = new Abs("n", new Abs("f", new Abs("x", new App(new Var("f"),  
                            new App(new App(new Var("n"), new Var("f")), new Var("x")))))); 
  // ZERO := λf. λx. x
  s.macro_lookup["ZERO"] = new Abs("f", new Abs("x", new Var("x")));
  // ONE  := λf. λx. f x
  s.macro_lookup["ONE"] = new Abs("f", new Abs("x", new App(new Var("f"), new Var("x"))));
  // PLUS := λm. λn. n SUCC m
  s.macro_lookup["PLUS"] = new Abs("m", new Abs("n", new App(new App(new Var("n"), 
                             new Macro("SUCC", s.macro_lookup["SUCC"])), new Var("m"))));

  // TRUE := λa. λb. a
  s.macro_lookup["TRUE"] = new Abs("a", new Abs("b", new Var("a")));
  // FALSE := λa. λb. b
  s.macro_lookup["TRUE"] = new Abs("a", new Abs("b", new Var("b")));
}

/**
 * Parse a lambda-calculus expression from a string.
 *
 * May throw a `ParseError` when the expression is not a valid term.
 */
export function parse(s: string): Expr {
  let scanner = new Scanner(s);
  init_macros(scanner);
  let expr = parse_expr(scanner);
  if (scanner.offset < s.length) {
    throw scanner.error("unexpected token");
  }
  return expr;
}
