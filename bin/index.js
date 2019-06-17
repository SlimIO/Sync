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
const Lock = require("@slimio/lock");

// Require Internal Dependencies
const { cloneRepo, getToken, log, pull, readTomlRemote } = require("../src/utils");

// Globals
require("make-promises-safe");
require("dotenv").config({ path: join(__dirname, "..", ".env") });

// Constants
const CWD = process.cwd();
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const EXCLUDES_REPOS = new Set(["governance", "n-api-ci", "blog"]);

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
 * @param {string} force Allows not exit even in case of negative respone
 * @returns {void|boolean}
 */
async function question(sentence, force) {
    const confirm = { type: "confirm",
        accept: "y",
        deny: "n",
        handle: "validQuestion",
        query: yellow(sentence)
    };

    const { validQuestion } = await qoa.prompt([Object.assign(confirm, question)]);

    if (force) {
        return validQuestion;
    }

    if (!validQuestion) {
        console.log(red("Exiting process."));
        process.exit(1);
    }

    return null;
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
    await question(`Do you want execut Sync in ${CWD} ?`);

    const spinner = new Spinner({
        prefixText: cyan().bold(`Search repositories for ${GITHUB_ORGA}`),
        spinner: "dots"
    });
    spinner.start("Work");

    const [remote, reposLocalSet] = await Promise.all([
        repos(GITHUB_ORGA, getToken()),
        reposLocalFiltered()
    ]);
    for (const repo of remote) {
        repo.name = repo.name.toLowerCase();
    }

    const searchNAPI = await Promise.all(
        remote.map(readTomlRemote)
    );
    searchNAPI.filter((repo) => repo !== false)
        .map((repo) => repo)
        .map((repo) => EXCLUDES_REPOS.add(repo));

    const testUNIX = RegExp("nix", "i");
    const reposRemoteArray = remote
        .filter(({ name, archived }) => !testUNIX.test(name) && !archived)
        .filter(({ name }) => !reposLocalSet.has(name) && !EXCLUDES_REPOS.has(name))
        .map(({ name }) => name);
        // For tests
        // .filter((repo) => repo.length <= 3);
    spinner.succeed(`${reposRemoteArray.length} repositories found ==> \n\n`);

    const ret = await Promise.all(
        reposRemoteArray.map((repos, index) => cloneRepo(repos, index))
    );

    // Display errors
    const err = ret.filter((repo) => repo !== null);
    if (err.length !== 0) {
        console.log("\n\n", `${cyan("Error(s) recap ==>")}\n`);
        err.map((err) => console.log(err));
        await question("\nThere were errors during the clone, do you want continue ?");
    }

    // Check update on existing repositories
    const repoNoUpdate = [];
    for (const { name, updated_at } of remote) {
        if (!reposLocalSet.has(name.toLowerCase())) {
            continue;
        }
        const timestamp = await log(name);

        if (!compareDates(new Date(updated_at), new Date(timestamp * 1000), name)) {
            repoNoUpdate.push(name);
        }
    }

    pullRepositories : if (repoNoUpdate.length > 0) {
        const sentence = `\n- ${repoNoUpdate.join("\n- ")}\n\nThe above repoitories doesn't update. Do you want update them ?`;
        const force = await question(sentence, "force");
        if (!force) {
            break pullRepositories;
        }

        const spin = new Spinner({
            prefixText: "Pull master from GitHub for each repository",
            spinner: "dots"
        }).start("Wait");
        await Promise.all(
            repoNoUpdate.map((repoName) => pull(repoName, true))
        );
        spin.succeed("Pull OK");
    }
}

main().catch(console.error);
