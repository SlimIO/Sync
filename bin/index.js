#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { existsSync, promises: { readdir, readFile, stat, access } } = require("fs");
const fs = require("fs");

// Require Third Party dependencies
const repos = require("repos");
const { cyan, red, yellow } = require("kleur");
const Spinner = require("@slimio/async-cli-spinner");
const qoa = require("qoa");
const git = require("isomorphic-git");

// Require Internal Dependencies
const { cloneRepo } = require("../src/utils");
git.plugins.set("fs", fs);

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
 * @func compareDates
 * @desc Compare the two date passed in arguments
 * @param {!Date} date1 First date
 * @param {!Date} date2 Second date
 * @returns {boolean}
 */
function compareDates(date1, date2) {
    const day = date1.getDate() === date2.getDate();
    const hours = date1.getHours() === date2.getHours();
    const minutes = date1.getMinutes() === date2.getMinutes();

    return day && hours && minutes;
}

/**
 * @async
 * @func question
 * @desc Question for the dev
 * @param {!string} sentence Sentence
 * @returns {void}
 */
async function question(sentence) {
    const confirm = { type: "confirm",
        accept: "y",
        deny: "n",
        handle: "validQuestion",
        query: sentence
    };

    const { validQuestion } = await qoa.prompt([Object.assign(confirm, question)]);
    if (!validQuestion) {
        console.log(red("Exiting process."));
        process.exit(1);
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
    let sentence = `${yellow(`Do you want execut Sync in ${CWD}`)} ?`;
    await question(sentence);

    const orga = process.env.ORGA;
    const token = envFileExist();
    const spinner = new Spinner({ prefixText: cyan().bold(`Search repositories for ${orga}`), spinner: "dots" });
    spinner.start("Work");

    const [remote, reposLocalSet] = await Promise.all([
        repos(orga, token),
        reposLocalFiltered()
    ]);
    // const log = remote.filter((repos, index) => repos.name === "Sync");
    // console.log(log);
    // process.exit(1);
    spinner.succeed(`${remote.length} repositories found ==> \n\n`);

    const reposRemoteArray = remote
        .map((repo) => repo.name.toLowerCase())
        .filter((repoName) => !reposLocalSet.has(repoName))
        // For tests
        .filter((repo) => repo.length <= 3);

    // const ret = await Promise.all(
    //     reposRemoteArray.map((repos, index) => cloneRepo(repos, index, token))
    // );
    const ret = [];

    // Display errors
    const err = ret.filter((repo) => repo !== null);
    if (err.length !== 0) {
        console.log("\n\n", `${cyan("Error(s) recap ==>")}\n`);
        err.map((err) => console.log(err));
        sentence = `\n${yellow("There were errors during the clone, do you want continue ?")}`;
        await question(sentence);
    }

    // Check update on existing repositories
    const repoNoUpdate = [];
    for (const { name, updated_at } of remote) {
        if (!reposLocalSet.has(name.toLowerCase())) {
            continue;
        }
        const { committer: { timestamp } } = (await git.log({
            gitdir: join(CWD, name, ".git"),
            depth: 1,
            ref: "master"
        }))[0];

        if (!compareDates(new Date(updated_at), new Date(timestamp * 1000))) {
            repoNoUpdate.push(name);
        }
    }
    if (repoNoUpdate !== 0) {
        console.log("\n\n", `${cyan("The following repoitories doesn't update. Do you want update them ?")}\n`);
        console.log(repoNoUpdate.join("\n"));
    }
}

main().catch(console.error);
