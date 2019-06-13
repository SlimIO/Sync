#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { existsSync, promises: { readdir, readFile, stat, access } } = require("fs");

// Require Third Party dependencies
const repos = require("repos");
const { cyan, red, yellow } = require("kleur");
const Spinner = require("@slimio/async-cli-spinner");
const qoa = require("qoa");

// Require Internal Dependencies
const { cloneRepo } = require("../src/utils");

// Globals
require("make-promises-safe");
require("dotenv").config({ path: join(__dirname, "..", ".env") });

// Constants
const CWD = process.cwd();

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

        return dir;
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
    const reposLocalStat = await Promise.all(
        localDir.map((name) => stat(join(CWD, name)))
    );
    const reposLocal = localDir
        .filter((name, idx) => reposLocalStat[idx].isDirectory())
        .map((name) => name.toLowerCase());
    const result = await Promise.all(reposLocal.map((name) => getSlimioToml(name)));

    return new Set(result.filter((name) => name !== false));
}

async function main() {
    console.log(`\n > Executing SlimIO Sync at: ${cyan().bold(CWD)}\n`);

    // Valid path
    const confirm = {
        type: "confirm",
        query: `${yellow(`Do you want execut Sync in ${CWD}`)} ?`,
        handle: "validPath",
        accept: "y",
        deny: "n"
    };
    const { validPath } = await qoa.prompt([confirm]);
    if (!validPath) {
        console.log(red("Exiting process."));
        process.exit(1);
    }

    const orga = process.env.ORGA;
    const rejects = [];
    const token = envFileExist();
    const spinner = new Spinner({ prefixText: cyan().bold(`Search repositories for ${orga}`), spinner: "dots" });
    spinner.start("Work");

    const [remote, reposLocalSet] = await Promise.all([
        repos(orga, token),
        reposLocalFiltered()
    ]);
    spinner.succeed(`${remote.length} repositories found ==> \n\n`);

    const reposRemoteArray = remote
        .map((repo) => repo.name.toLowerCase())
        .filter((repoName) => !reposLocalSet.has(repoName))
        // For tests
        .filter((repos) => repos.length <= 5);

    const ret = await Spinner.startAll(
        reposRemoteArray.map((repos) => Spinner.create(cloneRepo, repos, token))
    );
    console.log("\n\n", `${cyan("Actions recap ==>")}\n`);
    ret.map((repo) => console.log(repo));
}

main().catch(console.error);
