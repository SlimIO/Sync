"use strict";

/* eslint-disable global-require */
// Require Thirds Party dependencies
const lazy = require("@slimio/lazy");

const commands = lazy.of({});

commands.set("install", () => require("./install"));
commands.set("pspAll", () => require("./pspAll"));
commands.set("outdatedAll", () => require("./outdatedAll"));

module.exports = commands.value;
