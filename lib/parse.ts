/**
 * A very simple recursive-descent parser for the plain lambda-calculus.
 *
 * This version currently just returns `null` when any error is encountered.
 * Eventually, it should produce useful error information.
 */
import { Expr, Abs, App, Var } from './ast';

/**
 * A simple tokenization helper that advances an offset in a string.
 */
class Scanner {
  public offset: number;

  constructor(public str: string) {
    this.offset = 0;
  }

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
}

/**
 * Scan over any amount of whitespace.
 */
function skip_whitespace(s: Scanner): void {
  s.scan(/\s*/);
}

/**
 * Parse a variable name.
 */
function parse_ident(s: Scanner): string | null {
  return s.scan(/[A-Za-z0-9]+/);
}

/**
 * Parse a sequence of terms separated by whitespace: in other words,
 * a nested hierarchy of applications.
 */
function parse_expr(s: Scanner): Expr | null {
  skip_whitespace(s);
  let out_term = null;
  while (true) {
    let term = parse_term(s);
    if (term) {
      skip_whitespace(s);
      if (out_term === null) {
        // The first term.
        out_term = term;
      } else {
        // Stack this on as an application.
        out_term = new App(out_term, term);
      }
    } else {
      break;
    }
  }
  return out_term;
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
      // Unbalanced parentheses.
      return null;
    }
  }

  // Nothing found.
  return null;
}

/**
 * Parse a variable occurrence.
 */
function parse_var(s: Scanner): Expr | null {
  let name = parse_ident(s);
  if (name) {
    return new Var(name);
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
  let name = parse_ident(s);
  if (!name) {
    return null;
  }
  skip_whitespace(s);

  // Dot.
  if (!s.scan(/\./)) {
    return null;
  }
  skip_whitespace(s);

  // Body.
  let body = parse_expr(s);
  if (!body) {
    return null;
  }
  return new Abs(name, body);
}

/**
 * Parse a lambda-calculus expression from a string.
 */
export function parse(s: string): Expr | null {
  let scanner = new Scanner(s);
  let expr = parse_expr(scanner);
  if (scanner.offset < s.length) {
    console.error("parsing ended at offset", scanner.offset);
  }
  return expr;
}
