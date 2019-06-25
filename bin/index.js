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
    .option("-c, --clone", "Use only the clone for the all repositories SlimIO.")
    .option("-u, --update", "Use only the pull of the master branch for the all repositories SlimIO.")
    .action(async(options) => {
        const setOpts = new Set(["clone", "update"]);
        const opts = {};

        Object.keys(options)
            .filter((key) => key.length !== 1 && setOpts.has(key))
            .map((key) => Reflect.set(opts, key, true));

        await commands.install(opts);
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
