module.exports = function (babel) {
  const t = babel.types;
  return {
    visitor: {
      Program: {
        enter(innerPath) {
          this.state = {};
          this.state.reactiveExprs = [];
          this.state.callExprs = [];
          innerPath.traverse(scanner, { state: this.state });
          this.state.reactiveExprs = this.state.reactiveExprs.map(expr => {
            expr.statements.reverse();
            return expr;
          });
        },
        exit(innerPath) {
          innerPath.traverse(insertReactiveExprsVisitor, {
            state: this.state,
            t: t,
          });
        },
      },
      VariableDeclaration(innerPath) {
        if (innerPath.node.declarations[0].id.name !== 'ReactiveCall') return;
        this.state.reactiveExprs.forEach(expr => {
          expr.staticState.forEach(s => {
            innerPath.insertAfter(s);
          });
        });
      },
    },
  };
};

const insertReactiveExprsVisitor = {
  CallExpression(innerPath) {
    if (!innerPath.node.callee.name) return;
    let funcName = innerPath.node.callee.name;
    let argNames = innerPath.node.arguments.map(argNode => getArgName(argNode));
    this.state.callExprs.push({ funcName, argNames });

    for (let i = 0; i < this.state.reactiveExprs.length; i++) {
      let expr = this.state.reactiveExprs[i];
      if (expr.onCallParams.funcName === funcName) {
        if (argNamesEqual(expr.onCallParams.argNames, argNames)) {
          expr.statementsPath.traverse(replacePlaceholdersWithActual, {
            actualArgs: argNames,
            t: this.t,
          });
          expr.statements.forEach(statement => {
            innerPath.insertAfter(statement);
          });
        }
      }
    }
  },
  LabeledStatement(innerPath) {
    if (innerPath.node.label.name === 'ReactiveExpr') {
      innerPath.remove();
    }
  },
};

const replacePlaceholdersWithActual = {
  Identifier(innerPath) {
    if (!innerPath.node.name.startsWith('$')) return;
    let argIndex = parseInt(innerPath.node.name.slice(1)) - 1;
    innerPath.node.name = this.actualArgs[argIndex];
  },
};

const scanner = {
  LabeledStatement(innerPath) {
    if (innerPath.node.label.name === 'ReactiveExpr') {
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
        innerPath.parent.type === 'LabeledStatement' &&
        innerPath.parent.label.name === 'ReactiveExpr'
      ) {
        this.reactiveExprs.push({
          onCallParams: this.onCallParams,
          statements: innerPath.node.body.slice(1),
          statementsPath: innerPath,
          staticState: this.hasStaticState ? this.staticState.declarations : [],
          hasStaticState: this.hasStaticState,
        });
      }
    },
  },
  LabeledStatement(innerPath) {
    if (innerPath.node.label.name === 'OnCall') {
      let onCallParams = {
        funcName: null,
        argNames: [],
      };
      innerPath.traverse(onCallVisitor, { onCallParams });
      this.onCallParams = onCallParams;
    } else if (innerPath.node.label.name === 'StaticState') {
      this.hasStaticState = true;
      let staticState = {
        declarations: [],
        variables: [],
      };
      innerPath.traverse(staticStateVisitor, { staticState });
      this.staticState = staticState;
      innerPath.remove();
    }
  },
};

const staticStateVisitor = {
  BlockStatement: {
    enter(innerPath) {
      // change and save variable names
      innerPath.traverse(changeVariableNames, {
        staticState: this.staticState,
      });
    },
    exit(innerPath) {
      this.staticState.declarations = innerPath.node.body;
    },
  },
};

const changeVariableNames = {
  VariableDeclaration(innerPath) {},
};

const onCallVisitor = {
  SequenceExpression(innerPath) {
    let funcName = innerPath.node.expressions[0].name;
    let argNames = innerPath.node.expressions[1].elements.map(el => {
      return getArgName(el);
    });
    this.onCallParams.funcName = funcName;
    this.onCallParams.argNames = argNames;
  },
};

function argNamesEqual(exprArgs, actualArgs) {
  if (exprArgs[0] === '_') return true;
  console.log(exprArgs, actualArgs);
  if (exprArgs.length !== actualArgs.length) {
    return false;
  }
  for (let i = 0; i < exprArgs.length; i++) {
    if (exprArgs[i].startsWith('$')) {
      continue;
    }
    if (exprArgs[i] !== actualArgs[i]) {
      return false;
    }
  }
  return true;
}

function getArgName(argNode) {
  if (argNode.name) {
    return argNode.name;
  } else {
    return argNode.object.name + '[' + argNode.property.value + ']';
  }
}

// ./node_modules/.bin/babel src --out-dir lib
