#!/usr/bin/env node
"use strict";

const { join } = require("path");
require("make-promises-safe");
require("dotenv").config({ path: join(__dirname, "..", ".env") });

// Require Third-party Dependencies
const sade = require("sade");
const { white, yellow, cyan } = require("kleur");

// Require Internal Dependencies
const commands = require("../commands");

console.log(white().bold(`\n > Executing ${yellow().bold("psync")} at: ${cyan().bold(process.cwd())}\n`));
const prog = sade("psync").version("0.1.0");

prog
    .command("install")
    .describe("Clone, pull master branch, install dependencies of the all SlimIO projects")
    .option("-u, --update", "Use only the pull of the master branch for the all repositories SlimIO.")
    .option("-n, --noinstall", "Skip npm install")
    .option("-p, --pick", "Pick a given list of projects separated by a comma")
    .example("psync install --pick psp,registry,cli,is,core")
    .action(async(options) => {
        const pick = typeof options.p === "string" ? new Set(options.p.split(",").map((row) => row.toLowerCase())) : new Set();

        await commands.install(options.u, options.n, pick);
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

prog
    .command("infos")
    .describe("Get github informations on this repository")
    .action(async(options) => {
        const opts = options._.length > 0 ? options._.join("").split(",") : [];
        await commands.getInfos(opts);
    });

prog
    .command("git")
    .describe("Get current github organization repositories stats")
    .option("-a, --all", "Retrieve every account (with like greenkeeper)")
    .action(async({ all = false }) => {
        await commands.git(Boolean(all));
    });

prog.parse(process.argv);
