"use strict";

/* eslint-disable global-require */
// Require Thirds Party dependencies
const lazy = require("@slimio/lazy");

const commands = lazy.of({});

commands.set("install", () => require("./install"));
commands.set("update", () => require("./update"));
commands.set("pspAll", () => require("./pspAll"));
commands.set("getInfos", () => require("./infos"));
commands.set("outdatedAll", () => require("./outdatedAll"));
commands.set("git", () => require("./git"));

module.exports = commands.value;
