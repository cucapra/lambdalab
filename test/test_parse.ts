import * as test from 'tape';
import { parse, ParseError } from '../lib/parse';
import { pretty } from '../lib/ast';

test('variable', (t) => {
  let res = parse("x");
  t.equal(pretty(res), "x");
  t.end();
});

test('unbalanced', (t) => {
  t.throws(() => parse("("), ParseError as any);
  t.end();
});
