#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { existsSync, promises: { readdir, readFile, access, stat } } = require("fs");

// Require Third Party dependencies
const repos = require("repos");
const { white } = require("kleur");
const Spinner = require("@slimio/async-cli-spinner");

// Require Internal Dependencies
const { cloneRepo } = require("../src/utils");

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

    return envExist && envToken !== undefined ? { token: envToken } : {};
}

/**
 * @async
 * @func getSlimioToml
 * @desc Verify if .toml exist in the folder
 * @param {!String} dir Folder checked
 * @returns {Boolean}
 */
async function getSlimioToml(dir) {
    try {
        await access(join(CWD, dir, "slimio.toml"));

        return true;
    }
    catch (error) {
        return false;
    }
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

    for (let idx = 0; idx < localDir.length; idx++) {
        if (!reposLocalStat[idx].isDirectory()) {
            continue;
        }

        if (await getSlimioToml(localDir[idx])) {
            reposLocalSet.add(localDir[idx].toLowerCase());
        }
    }

    return reposLocalSet;
}

async function main() {
    console.log(`\n > Executing SlimIO Sync at: ${white().bold(process.cwd())}\n`);

    const reposRemoteArray = [];
    const remote = await repos("SlimIO", envFileExist());
    for (const repo of remote) {
        reposRemoteArray.push(repo.name);
    }
    reposRemoteArray.map((name) => name.toLowerCase());

    const reposLocalSet = await reposLocalFiltered();
    for (let idx = 0; idx < reposRemoteArray.length; idx++) {
        if (reposLocalSet.has(reposRemoteArray[idx])) {
            continue;
        }

        reposLocalSet.add(reposRemoteArray[idx]);
        cloneRepo(reposRemoteArray[idx], envFileExist());

        if (idx === 3) {
            break;
        }
    }
    await Promise.all(
    )
}

main();
