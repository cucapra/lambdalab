#!/usr/bin/env node
/**
 * The command-line script.
 */
import * as ast from './lib/ast';
import { pretty } from './lib/ast';
import { parse } from './lib/parse';
import { reduce } from './lib/reduce';

console.log(pretty(parse("x")!));
console.log(pretty(parse("λx.x")!));
console.log(pretty(parse("x y")!));
console.log(pretty(parse("x y z")!));
console.log(pretty(parse("λx.x y")!));
console.log(pretty(parse("λ x . x y")!));
console.log(pretty(parse("x (y z)")!));
console.log(pretty(parse(" x ( y z ) ")!));
console.log(pretty(parse("(\\x. x)(\\y. y)")!));
console.log(pretty(parse("λt. (λf. t (λz. f f z)) (λf. t (λz. f f z))")!));

let e1 = parse("(\\x. x)(\\y. y)")!;
console.log(pretty(e1));
console.log(pretty(reduce(e1)!));

let e2 = parse("(\\x. y)(\\y. y)")!;
console.log(pretty(e2));
console.log(pretty(reduce(e2)!));

let e3 = parse("(\\x. x x)(\\y. y y)")!;
console.log(pretty(e3));
console.log(pretty(reduce(e3)!));
