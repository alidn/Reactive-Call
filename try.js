module.exports = function (babel) {
  const t = babel.types;
  return {
    pre(state) {
      this.state = new Map();
      this.state.reactiveExprs = [];
      this.state.callExprs = [];
    },
    visitor: {
      Program: {
        exit() {
          // console.log(JSON.stringify(this.state.reactiveExprs, null, 2));
          console.log(this.state.reactiveExprs);
          console.log(this.state.callExprs);
        },
      },
      LabeledStatement(innerPath) {
        if (innerPath.node.label.name === "ReactiveExpr") {
          innerPath.traverse(ReactiveExprVisitor, {
            reactiveExprs: this.state.reactiveExprs,
          });
        }
      },
      CallExpression(innerPath) {
        if (!innerPath.node.callee.name) return;
        this.state.callExprs.push({
          funcName: innerPath.node.callee.name,
          argNames: innerPath.node.arguments.map((arg) => arg.name),
        });
      },
    },
    post(state) {},
  };
};

const ReactiveExprVisitor = {
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
      innerPath.traverse(OnCallVisitor, { onCallParams });
      this.onCallParams = onCallParams;
    }
  },
};

const OnCallVisitor = {
  SequenceExpression(innerPath) {
    let funcName = innerPath.node.expressions[0].name;
    let argNames = innerPath.node.expressions[1].elements.map((el) => el.name);
    this.onCallParams.funcName = funcName;
    this.onCallParams.argNames = argNames;
  },
};

function getOnCallLabelFuncName(node) {
  return node.body.expression.expressions[0].name;
}
