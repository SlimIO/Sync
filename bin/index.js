#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { readdir, readFile, writeFile } = require("fs").promises;
const { existsSync } = require("fs");

// Require Third Party dependencies
const repos = require("repos");
const { yellow } = require("kleur");

// Globals
require("make-promises-safe");
require("dotenv").config({ path: join(process.cwd(), ".env") });

// Constants

/**
 * @func envFileExist
 * @desc Check if .env exist and if there is a github token.
 * @returns {{}|{token:String}}
 */
function envFileExist() {
    const envExist = existsSync(join(process.cwd(), ".env"));
    const envToken = process.env.GITHUB_TOKEN;
    if (envExist && envToken !== undefined) {
        console.log("Il y a un token");

        return { token: envToken };
    }

    return {};
}

async function main() {
    const remoteRepos = await repos("SlimIO");
    const reposSet = [];
    for (const repo of remoteRepos) {
        reposSet.push(repo.name);
    }
}

main();
