#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { existsSync, promises: { readdir, readFile, writeFile, stat } } = require("fs");

// Require Third Party dependencies
const repos = require("repos");
const { white } = require("kleur");
const Spinner = require("@slimio/async-cli-spinner");

// Globals
require("make-promises-safe");
require("dotenv").config({ path: join(process.cwd(), ".env") });

// Constants
const CWD = process.cwd();

/**
 * @func envFileExist
 * @desc Check if .env exist and if there is a github token.
 * @returns {{}|{token:String}}
 */
function envFileExist() {
    const envExist = existsSync(join(process.cwd(), ".env"));
    const envToken = process.env.GITHUB_TOKEN;
    if (envExist && envToken !== undefined) {
        return { token: envToken };
    }

    return {};
}

async function reposLocalFiltered(remoteArray) {
    const localDir = await readdir(CWD);
    const reposLocalSet = new Set();

    const reposLocalStat = await Promise.all(
        localDir.map((name) => stat(join(CWD, name)))
    );

    for (let _i = 0; _i < localDir.length; _i++) {
        if (reposLocalStat[_i].isDirectory()) {
            reposLocalSet.add(localDir[_i].toLowerCase());
        }
    }
}

async function main() {
    console.log(`\n > Executing SlimIO Sync at: ${white().bold(process.cwd())}\n`);
    const reposRemoteArray = [];
    const remote = await repos("SlimIO", envFileExist());
    for (const repo of remote) {
        reposRemoteArray.push(repo.name.toLowerCase());
    }

    for (let _i = 0; _i < localDir.length; _i++) {
        if (reposLocalStat[_i].isDirectory()) {
            reposLocalSet.add(localDir[_i].toLowerCase());
        }
    }

    for (let _i = 0; _i < reposRemoteArray.length; _i++) {
        if (reposLocalSet.has(reposRemoteArray[_i])) {
            continue;
        }


    }
}

main();
