import * as test from 'tape';
import { pretty } from '../lib/ast';
//import { reduce } from '../lib/reduce';
import { parse } from '../lib/parse';

/*test('value', (t) => {
  let res = reduce(parse("\\x. x")!);
  t.equal(res, null);
  t.end();
});

test('idid', (t) => {
  let res = reduce(parse("(\\x. x) (\\y. y)")!);
  t.equal(pretty(res!), "λy. y");
  t.end();
});*/
