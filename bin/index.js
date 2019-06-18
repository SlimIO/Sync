#!/usr/bin/env node

require("make-promises-safe");

// Require Node.js dependencies
const { join } = require("path");

// Require Third-party Dependencies
const sade = require("sade");

// Require Internal Dependencies
const commands = require("../commands");

const prog = sade("slimio-sync");

prog
    .command("install")
    .describe("Clone, pull master branch, install dependencies of the all SlimIO projects")
    .action(async() => {
        await commands.install();
    });

prog.parse(process.argv);
