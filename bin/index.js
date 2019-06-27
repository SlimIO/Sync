#!/usr/bin/env node
/* eslint-disable id-length */

const { join } = require("path");
require("make-promises-safe");
require("dotenv").config({ path: join(__dirname, "..", ".env") });

// Require Third-party Dependencies
const sade = require("sade");
const { white, yellow, cyan } = require("kleur");

// Require Internal Dependencies
const commands = require("../commands");

console.log(white().bold(`\n > Executing ${yellow().bold("psync")} at: ${cyan().bold(process.cwd())}\n`));
const prog = sade("slimio-sync").version("0.1.0");

prog
    .command("install")
    .describe("Clone, pull master branch, install dependencies of the all SlimIO projects")
    .option("-u, --update", "Use only the pull of the master branch for the all repositories SlimIO.")
    .option("-d, --dev", "Use only the clone for a given number or the all repositories SlimIO if no number.")
    .action(async(options) => {
        await commands.install(options.u, options.d);
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
