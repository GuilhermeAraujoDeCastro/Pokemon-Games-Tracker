import { test } from "node:test";
import assert from "node:assert/strict";
import { debounce } from "../js/debounce.js";

test("debounce only calls fn once after the calls stop, with the last arguments", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let callCount = 0;
  let lastArg = null;
  const debounced = debounce((value) => {
    callCount += 1;
    lastArg = value;
  }, 250);

  debounced("a");
  debounced("b");
  debounced("c");
  assert.equal(callCount, 0);

  t.mock.timers.tick(249);
  assert.equal(callCount, 0);

  t.mock.timers.tick(1);
  assert.equal(callCount, 1);
  assert.equal(lastArg, "c");
});

test("debounce runs again for a call made after the delay already fired", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let callCount = 0;
  const debounced = debounce(() => {
    callCount += 1;
  }, 100);

  debounced();
  t.mock.timers.tick(100);
  assert.equal(callCount, 1);

  debounced();
  t.mock.timers.tick(100);
  assert.equal(callCount, 2);
});
