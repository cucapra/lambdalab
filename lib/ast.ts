/**
 * AST for the lambda-calculus.
 */

/**
 * The variable syntax form.
 */
export class Var {
  kind: "var";
  constructor(
    public readonly name: string
  ) {
    this.kind = "var";
  };

  public copy() : Var {
    return new Var(this.name);
  }
}

/**
 * The application syntax form.
 */
export class App {
  kind: "app";
  constructor(
    public readonly e1: Expr,
    public readonly e2: Expr
  ) {
    this.kind = "app";
  };

  public copy() : App {
    return new App(this.e1, this.e2);
  }
}

/**
 * The abstraction syntax form.
 */
export class Abs {
  kind: "abs";
  constructor(
    public readonly vbl: string,
    public readonly body: Expr
  ) {
    this.kind = "abs";
  };

  public copy() : Abs {
    return new Abs(this.vbl, this.body);
  }
}

/**
 * The macro syntax form. Macros must be closed
 */
export class Macro {
  kind: "macro";
  constructor(
    public readonly name: string,
    public readonly body: Expr
  ) {
    this.kind = "macro";
  };

  public copy() : Macro {
    return new Macro(this.name, this.body);
  }
}

/**
 * Any lambda-term.
 */
export type Expr = Var | App | Abs | Macro;

/** 
 * Structure containing data about most recent eval step for printing purposes
 */

export class StepInfo {
  public shadowed : boolean; // for coloring variables, we keep track of whether the current
  public active : boolean;  // variable is abstracted or not
  constructor(
    public readonly beta: boolean, // whether the last step was a macro expansion (false) or a beta reduction (true)
    public readonly abs: Abs | null, // the abstraction being substituted into
    public readonly target: Expr | null,  // the expresion being substituted
    public readonly vbl: string | null,  // the variable being replaced
    public readonly macro: Macro | null // the macro being expanded
  ) {
    this.shadowed = false;
    this.active = false;
  };
  
  public copy() : StepInfo {
    let step = new StepInfo(this.beta, this.abs, this.target, this.vbl, this.macro);
    step.shadowed = this.shadowed;
    step.active = this.active;
    return step;
  }
}

/**
 * Pretty-print a lambda-calculus expression as a string. Inserts tags for coloring 
 * in the document. 
 */
export function pretty(e: Expr, step : StepInfo | null): string {
  let res = "";
  switch (e.kind) {
    case "var":
    // color a variable blue if it is the currently abstracted variable:
    // it is inside the abstraction in the current redex and has not been shadowed
    // within that abstraction
    if (step && step.beta && step.vbl == e.name && step.active && !step.shadowed)
      res += "<a>" + e.name + "</a>"
    else 
      res += e.name;
      break;
    case "abs":
      // color the abstraction blue if it is the active abstraction, and 
      // set the active flag for coloring variables within the abstraction
      if (step && step.beta && step.abs === e) {
        let new_step = step.copy();
        new_step.active = true;
        res += "<a>λ" + e.vbl + "</a>. " + pretty(e.body, new_step);
      } else if (step && step.beta && step.active && step.abs!.vbl === e.vbl) {
        // set the shadowed flag if this abstraction abstracts the same name as the
        // active one
        let new_step = step.copy()
        new_step.shadowed = true;
        res += "λ" + e.vbl + ". " + pretty(e.body, new_step);
      } else
        res += "λ" + e.vbl + ". " + pretty(e.body, step);
      break;
    case "macro":
      // color the macro blue
      if (step && !step.beta && e === step.macro) {
        res += "<a>" + e.name + "</a>";
      } else {
        res += e.name;
      }
      break;
    case "app":
      // Parenthesize abstractions on the left.
      let lhs = pretty(e.e1, step);
      if (e.e1 instanceof Abs) {
        lhs = "(" + lhs + ")";
      }

      // Parenthesize applications and abstractions on the right.
      let rhs = pretty(e.e2, step);
      if (e.e2 instanceof App || e.e2 instanceof Abs) {
        rhs = "(" + rhs + ")"
      }
      if (step && step.beta && e.e2 === step.target) {
        rhs = "<s>" + rhs + "</s>"
      }
      res += lhs + " " + rhs;
      break;
  }
  return res;
}

/**
 * Format a lambda calculus program as a dot file
 */

export function convertToDot(e : Expr, step : StepInfo | null) : string {
  let rhsLabels : string[] = [];
  let inRhs = false;
  function collectTree(e : Expr, parent : number | null, self : number) : [string[], string[]] {
    let connection : string[] = [];
    let ret : [string[], string[]];
    let label : string = "";
    if (parent) {
      connection = [parent + " -- " + self +";"];
    }
    switch (e.kind) {
      case "var":
        label = self + " [label=\"" + e.name + "\"];";
        ret = [[label], connection];
        break;
      case "abs":
        label = self + " [label=\"λ" + e.vbl + "\"];";
        let [sublabels, subtree] = collectTree(e.body, self, self * 2);
        ret = [sublabels.concat([label]), subtree.concat(connection)];
        break;
      case "macro":
        label = self + " [label=\"" + e.name + "\"];";
        ret = [[label], connection];
        break;
      case "app":
        label = self + " [label=\"APP\"];";
        let [sublabels1, subtree1] = collectTree(e.e1, self, self * 2);
        if (step && step.beta && step.target === e.e2) inRhs = true;
        let [sublabels2, subtree2] = collectTree(e.e2, self, self * 2 + 1);
        inRhs = false;
        ret = [sublabels1.concat(sublabels2, [label]), subtree1.concat(subtree2, connection)];
        break;
      default: //impossible
        return [[],[]];
    }
    if (inRhs) rhsLabels.push(label);
    return ret;
  }
  let [nodes, connections] = collectTree(e, 0, 1);
  let labels = nodes.reduce((acc : string, elt : string) => acc + "\n" + elt);
  let treeString = "";

  if (connections.length > 0) {
    treeString = connections.reduce((acc : string, elt : string) => acc + "\n" + elt);
  }
  if (step) {
    let substExpr = "subgraph cluster_1 {\n style=filled;\ncolor=red;\n " 
      + rhsLabels.reduce((acc : string, elt : string) => acc + "\n" + elt) + "\n}";
    return "graph AST {\n" + labels + "\n" + treeString + "\n" + substExpr + "}";
  }
  return "graph AST {\n" + labels + "\n" + treeString + "}";
}