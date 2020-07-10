module.exports = function (babel) {
  return {
    visitor: {
      Program: {
        enter(innerPath) {
          this.state = {};
          this.state.reactiveExprs = [];
          this.state.callExprs = [];
          innerPath.traverse(scanner, { state: this.state });
          console.log(this.state.reactiveExprs);
          this.state.reactiveExprs = this.state.reactiveExprs.map((expr) => {
            expr.statements.reverse();
            return expr;
          });
        },
        exit(innerPath) {
          innerPath.traverse(insertReactiveExprsVisitor, { state: this.state });
          console.log(
            this.state.reactiveExprs.map((expr) => expr.onCallParams.argNames)
          );
          console.log(this.state.callExprs);
        },
      },
    },
  };
};

const insertReactiveExprsVisitor = {
  CallExpression(innerPath) {
    if (!innerPath.node.callee.name) return;
    let funcName = innerPath.node.callee.name;
    let argNames = innerPath.node.arguments.map((argNode) =>
      getArgName(argNode)
    );
    this.state.callExprs.push({ funcName, argNames });
    for (let i = 0; i < this.state.reactiveExprs.length; i++) {
      let expr = this.state.reactiveExprs[i];
      if (expr.onCallParams.funcName === funcName) {
        if (argNamesEqual(expr.onCallParams.argNames, argNames)) {
          expr.statements.forEach((statement) => {
            innerPath.insertAfter(statement);
          });
        }
      }
    }
  },
  LabeledStatement(innerPath) {
    if (innerPath.node.label.name === "ReactiveExpr") {
      innerPath.remove();
    }
  },
};

const scanner = {
  LabeledStatement(innerPath) {
    if (innerPath.node.label.name === "ReactiveExpr") {
      innerPath.traverse(reactiveExprVisitor, {
        reactiveExprs: this.state.reactiveExprs,
      });
    }
  },
};

const reactiveExprVisitor = {
  BlockStatement: {
    exit(innerPath) {
      if (
        innerPath.parent.type === "LabeledStatement" &&
        innerPath.parent.label.name === "ReactiveExpr"
      ) {
        this.reactiveExprs.push({
          onCallParams: this.onCallParams,
          statements: innerPath.node.body.slice(1),
        });
      }
    },
  },
  LabeledStatement(innerPath) {
    if (innerPath.node.label.name === "OnCall") {
      let onCallParams = {
        funcName: null,
        argNames: [],
      };
      innerPath.traverse(onCallVisitor, { onCallParams });
      this.onCallParams = onCallParams;
    }
  },
};

const onCallVisitor = {
  SequenceExpression(innerPath) {
    let funcName = innerPath.node.expressions[0].name;
    let argNames = innerPath.node.expressions[1].elements.map((el) => {
      return getArgName(el);
    });
    this.onCallParams.funcName = funcName;
    this.onCallParams.argNames = argNames;
  },
};

function argNamesEqual(leftArgs, rightArgs) {
  if (leftArgs.length !== rightArgs.length) {
    return false;
  }
  for (let i = 0; i < leftArgs.length; i++) {
    if (leftArgs[i] !== rightArgs[i]) {
      return false;
    }
  }
  return true;
}

function getArgName(argNode) {
  if (argNode.name) {
    return argNode.name;
  } else {
    return argNode.object.name + "[" + argNode.property.value + "]";
  }
}
