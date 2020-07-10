"use strict";
var deleteDuplicates = function (head) {
  function process(node) {}
  let node = head;
  while (node != null) {
    process(node);
    node = node.next;
  }
};

ReactiveExpr: {
  OnCall: process, [node];
  let arr = [];
  let lastDulicate = -1;
  let haveSeenDuplicate = false;
  if (node.next != null && node.val === node.next.val) {
    lastDulicate = node.val;
    haveSeenDuplicate = true;
  }
  if (!haveSeenDuplicate || node.val != lastDulicate) {
    arr.push(node.val);
  }
}
