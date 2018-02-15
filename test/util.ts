import { Expr } from '../lib/ast';
import { parse, ParseError } from '../lib/parse';

/**
 * Parse, asserting that we have a parseable expression.
 
export function aparse(e: string): Expr {
  let out = parse(e);
  if (out instanceof ParseError) {
    throw "parse error: " + out.msg;
  }
  return out;
} */
