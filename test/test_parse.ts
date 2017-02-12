import * as test from 'tape';
import { parse } from '../lib/parse';
import { pretty } from '../lib/ast';

test('variable', (t) => {
  let res = pretty(parse("x")!);
  t.equal(res, "x");
  t.end();
});
