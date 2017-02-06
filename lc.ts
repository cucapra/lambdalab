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
 * AST for the lambda-calculus.
 */
class Expr {}
class Var extends Expr {
  constructor(public name: string) {
    super();
  };
}
class App extends Expr {
  constructor(public e1: Expr, public e2: Expr) {
    super();
  };
}
class Abs extends Expr {
  constructor(public vbl: string, public body: Expr) {
    super();
  };
}

/**
 * Parse a sequence of terms separated by whitespace: in other words,
 * a nested hierarchy of applications.
 */
function parse_expr(s: Scanner): Expr | null {
  let out_term = null;
  while (true) {
    let term = parse_term(s);
    if (term) {
      s.scan(/\s+/);  // Skip whitespace.
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

function parse_term(s: Scanner): Expr | null {
  let vbl = parse_var(s);
  if (vbl) {
    return vbl;
  }
  let abs = parse_abs(s);
  if (abs) {
    return abs;
  }
  return null;
}

function parse_var(s: Scanner): Expr | null {
  let name = s.scan(/[A-Za-z0-9]+/);
  if (name) {
    return new Var(name);
  } else {
    return null;
  }
}

function parse_app(s: Scanner): Expr | null {
  let e1 = parse_term(s);
  if (!e1) {
    return null;
  }
  s.scan(/\s+/);  // Skip whitespace.
  let e2 = parse_term(s);
  if (!e2) {
    return null;
  }
  return new App(e1, e2);
}

function parse_abs(s: Scanner): Expr | null {
  if (!s.scan(/\\|λ/)) {
    return null;
  }
  let name = s.scan(/[A-Za-z0-9]+/);
  if (!name) {
    return null;
  }
  if (!s.scan(/\./)) {
    return null;
  }
  let body = parse_term(s);
  if (!body) {
    return null;
  }
  return new Abs(name, body);
}

function parse(s: string) {
  let scanner = new Scanner(s);
  let expr = parse_expr(scanner);
  if (scanner.offset < s.length) {
    console.error("parsing ended at offset", scanner.offset);
  }
  return expr;
}

console.log(parse("x"));
console.log(parse("λx.x"));
console.log(parse("x y"));
console.log(parse("x y z"));
console.log(parse("λx.x y"));
