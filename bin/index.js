#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { readdir, readFile, writeFile, stat } = require("fs").promises;
const { existsSync } = require("fs");

// Require Third Party dependencies
const repos = require("repos");
const { white } = require("kleur");

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

async function main() {
    console.log(`\n > Executing SlimIO Sync at: ${white().bold(process.cwd())}\n`);
    const reposSet = [];
    try {
        const remoteRepos = await repos("SlimIO", envFileExist());
        for (const repo of remoteRepos) {
            reposSet.push(repo.name);
        }
    }
    catch (error) {
        console.log(error);
    }

    const reposLocal = await readdir(CWD);
    for (const dir of reposLocal) {
        const st = await stat(join(CWD, dir));
        if (st.isDirectory()) {
            console.log("prout");
        }
    }
    // console.log(reposLocal);
}

main();
