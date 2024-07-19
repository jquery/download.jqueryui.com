"use strict";

// Max time for done() to fire in an async test.
QUnit.config.testTimeout = 15e3; // 15 seconds

// Enforce an "expect" argument or expect() call in all test bodies.
QUnit.config.requireExpects = true;
