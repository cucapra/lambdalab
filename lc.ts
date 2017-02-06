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

function parse_term(s: Scanner): Expr | null {
  let vbl = parse_var(s);
  if (vbl) {
    return vbl;
  }
  let abs = parse_abs(s);
  if (abs) {
    return abs;
  }
  let app = parse_app(s);
  if (app) {
    return app;
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
  let expr = parse_term(scanner);
  if (scanner.offset < s.length) {
    console.error("parsing ended at offset", scanner.offset);
  }
  return expr;
}

console.log(parse("x"));
console.log(parse("λx.x"));
console.log(parse("x y"));
