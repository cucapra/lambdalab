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

let e = parse("(\\x. x)(\\y. y)")!;
console.log(pretty(e));
console.log(pretty(reduce(e)!));
