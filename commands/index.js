/* eslint-disable global-require */
// Require Thirds Party dependencies
const lazy = require("@slimio/lazy");

const commands = lazy.of({});

commands.set("install", () => require("./install"));

module.exports = commands.value;
