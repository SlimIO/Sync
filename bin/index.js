#!/usr/bin/env node

// Require Node.js dependencies
const { join, extname } = require("path");
const { existsSync, promises: { readdir, readFile, writeFile, stat } } = require("fs");

// Require Third Party dependencies
const repos = require("repos");
const { white } = require("kleur");
const Spinner = require("@slimio/async-cli-spinner");

// Globals
require("make-promises-safe");
require("dotenv").config({ path: join(__dirname, "..", ".env") });

// Constants
const CWD = join(process.cwd());

/**
 * @func envFileExist
 * @desc Check if .env exist and if there is a github token.
 * @returns {{}|{token:String}}
 */
function envFileExist() {
    const envExist = existsSync(join(__dirname, "..", ".env"));
    const envToken = process.env.GITHUB_TOKEN;
    if (envExist && envToken !== undefined) {
        return { token: envToken };
    }

    return {};
}

/**
 * @async
 * @func getSlimioToml
 * @desc Verify if .toml exist in the folder
 * @param {!String} dir Folder checked
 * @returns {Boolean}
 */
async function getSlimioToml(dir) {
    const mainDir = await readdir(dir);
    for (const file of mainDir) {
        if (extname(file) === ".toml") {
            return true;
        }
    }

    return false;
}

/**
 * @async
 * @func reposLocalFiltered
 * @desc Filters local repositories
 * @returns {String[]}
 */
async function reposLocalFiltered() {
    const localDir = await readdir(CWD);
    const reposLocalSet = new Set();

    const reposLocalStat = await Promise.all(
        localDir.map((name) => stat(join(CWD, name)))
    );

    for (let _i = 0; _i < localDir.length; _i++) {
        if (!reposLocalStat[_i].isDirectory()) {
            continue;
        }

        if (await getSlimioToml(localDir[_i])) {
            reposLocalSet.add(localDir[_i].toLowerCase());
        }
    }

    return reposLocalSet;
}

async function main() {
    console.log(`\n > Executing SlimIO Sync at: ${white().bold(process.cwd())}\n`);
    const reposRemoteArray = [];
    const remote = await repos("SlimIO", envFileExist());
    for (const repo of remote) {
        reposRemoteArray.push(repo.name.toLowerCase());
    }

    const reposLocalSet = await reposLocalFiltered();
    for (let _i = 0; _i < reposRemoteArray.length; _i++) {
        if (reposLocalSet.has(reposRemoteArray[_i])) {
            continue;
        }

        reposLocalSet.add(reposRemoteArray[_i]);
        
    }

}

main();
