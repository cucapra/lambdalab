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
    public readonly macro: Macro | null, // the macro being expanded
    public readonly substituted: Expr[] // the appearances of the target in the resulting expression
  ) {
    this.shadowed = false;
    this.active = false;
  };
  
  public copy() : StepInfo {
    let step = new StepInfo(this.beta, this.abs, this.target, this.vbl, this.macro, this.substituted);
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
 * Format a lambda calculus program as a dot file.
 */

export function convertToDot(e : Expr, step : StepInfo | null) : string {
  function collectTree(e : Expr, parent : number | null, self : number, target : number | null, vars : number[]) : [string, string[], number | null, number[]] {
    let connection : string[] = [];
    let outline = "style=\"\";\ncolor=red;\n";
    let noout = "style=\"invis\";\n";
    // Outline the target subtree of the execution in red
    let style = (step && step.beta && step.substituted.indexOf(e) >= 0) || 
                (step && step.beta && step.target === e) ? outline : noout;
    let label : string = "subgraph cluster_" + self + " {\n" + style;
    if (style == outline) {
      target = self; //set the target to the current node
    } 
    if (parent) { // Add an edge from the parent to this child
      connection = [parent + " -> " + self +";"];
    }
    switch (e.kind) {
      case "var":
        if (step && step.beta && step.active && !step.shadowed && step.vbl === e.name) {
          vars = vars.concat(self);
        }
        label = label + self + " [label=\"" + e.name + "\"];\n}\n";
        return [label, connection, target, vars];
      case "abs":
        if (step && step.beta && step.abs === e) {
          step.active = true;
        } else if (step && step.beta && step.active && step.abs!.vbl === e.vbl) {
          step.shadowed = true;
        }
        label = label + self + " [label=\"λ" + e.vbl + "\"];\n";
        let [sublabels, subtree, t, v] = collectTree(e.body, self, self * 2, target, vars);
        label = label + sublabels + "}\n";
        return [label, subtree.concat(connection), t, v];
      case "macro":
        label = label + self + " [label=\"" + e.name + "\"];\n}\n";
        return [label, connection, target, vars];
      case "app":
        label = label + self + " [label=\"APP\"];\n";
        let [sublabels1, subtree1, t1, v1] = collectTree(e.e1, self, self * 2, target, vars);
        let [sublabels2, subtree2, t2, v2] = collectTree(e.e2, self, self * 2 + 1, target, vars);
        label = label + sublabels1 + sublabels2 + "}\n";
        return [label, subtree1.concat(subtree2, connection), t1 || t2, v1.concat(v2)];
      default: //impossible
        return ["",[], null, []];
    }
  }
  let [nodeTree, connections, target, vars] = collectTree(e, 0, 1, null, []);
  let treeString = "edge [dir=none]\n";

  if (step) { //we don't want any possible changes to step to escape this function
    step.active = false;
    step.shadowed = false;
  }

  if (connections.length > 0) { //add computed edges to graph
    treeString = treeString + connections.reduce((acc : string, elt : string) => acc + "\n" + elt);
  }
  if (vars.length > 0 && target) {
    treeString = treeString + "\nedge [dir=forward, color=blue]";
    treeString = vars.reduce(
      (acc : string, elt : number) => acc + "\n" + //connect target cluster to vars
      target + " -> " + elt + " [lhead=cluster"+target+", ltail=cluster"+elt+", style=dashed]", treeString);
  }
  return "digraph AST {\ncompound=true;\nordering=out;\n" + nodeTree + "\n" + treeString + "}";
}