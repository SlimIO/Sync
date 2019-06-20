#!/usr/bin/env node

require("make-promises-safe");

// Require Third-party Dependencies
const sade = require("sade");
const { white, yellow, cyan } = require("kleur");

// Require Internal Dependencies
const commands = require("../commands");

console.log(white().bold(`\n > Executing ${yellow().bold("slimio-sync psp")} at: ${cyan().bold(process.cwd())}\n`));
const prog = sade("slimio-sync").version("0.1.0");

prog
    .command("install")
    .describe("Clone, pull master branch, install dependencies of the all SlimIO projects")
    .action(async() => {
        await commands.install();
    });

prog
    .command("outdated")
    .describe("Check the npm registry to see if any (or, specific) installed packages are currently outdated.")
    .action(async() => {
        await commands.outdatedAll();
    });

prog
    .command("psp")
    .describe("Launch project structure policy")
    .action(async() => {
        await commands.pspAll();
    });

prog.parse(process.argv);
