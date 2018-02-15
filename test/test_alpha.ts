import * as test from 'tape';
import { pretty, Abs, App, Var, Macro } from '../lib/ast';
import { alpha_equivalent } from '../lib/macro';
import { Strategy } from '../lib/reduce';

test('id', (t) => {
  let id = new Abs("x", new Var("x"));
  let id2 = new Abs("y", new Var("y"));
  t.equal(alpha_equivalent(id, id2), true);
  t.end();
});

test('succ', (t) => {
  let succ = new Abs("n", new Abs("f", new Abs("x", new App(new Var("f"),  
  new App(new App(new Var("n"), new Var("f")), new Var("x"))))));
  let succ2 = new Abs("a", new Abs("g", new Abs("z", new App(new Var("g"),  
  new App(new App(new Var("a"), new Var("g")), new Var("z"))))));
  t.equal(alpha_equivalent(succ, succ2), true);
  t.end();
});

test('bool', (t) => {
  let tr = new Abs("a", new Abs("b", new Var("a")));
  let fl = new Abs("a", new Abs("b", new Var("b")));
  t.equal(alpha_equivalent(tr, fl), false);
  t.end();
});

test('shadow', (t) => {
  let fl = new Abs("a", new Abs("b", new Var("b")));
  let fl2 = new Abs("a", new Abs("a", new Var("a")));
  t.equal(alpha_equivalent(fl, fl2), true);
  t.end();
});