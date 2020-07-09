"use strict";

let a = 1;
let b = 3;
let c;
let d;

function do_something(param1, param2) {
  console.log("Doing something with my params");
}

do_something(a, b);

ReactiveExpr: {
  OnCall: do_something, [a, b];
  console.log("do_something was called on a and b");
  if (a == 1) {
  }
}

do_something(b, c);

ReactiveExpr: {
  OnCall: do_something, [_];
  console.log("Another statement");
}
