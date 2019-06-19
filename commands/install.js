#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { readdir, stat, access } = require("fs").promises;

// Require Third Party dependencies
const repos = require("repos");
const { cyan, red, yellow } = require("kleur");
const Spinner = require("@slimio/async-cli-spinner");
const qoa = require("qoa");
const sade = require("sade");

// Require Internal Dependencies
const { cloneRepo, getToken, logRepoLocAndRemote,
    pullMaster, readTomlRemote, getSlimioToml } = require("../src/utils");

// Globals
require("make-promises-safe");
require("dotenv").config({ path: join(__dirname, "..", ".env") });

// Constants
const CWD = process.cwd();
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const EXCLUDES_REPOS = new Set(["governance", "n-api-ci", "blog"]);

/**
 * @async
 * @func question
 * @desc Question for the dev
 * @param {!string} sentence Sentence
 * @param {string} force Allows not exit even in case of negative respone
 * @returns {void|boolean}
 */
async function question(sentence, force = false) {
    const confirm = { type: "confirm",
        accept: "y",
        deny: "n",
        handle: "validQuestion",
        query: yellow(sentence)
    };

    const { validQuestion } = await qoa.prompt([confirm]);

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

/**
 * @async
 * @func install
 * @desc Clone - pull master and installing dependencies for the all projects SlimIO
 * @returns {Promise<void>}
 */
async function install() {
    console.log(`\n > Executing ${yellow("slimio-sync install")} at: ${cyan().bold(CWD)}\n`);
    await question(`Do you want execut Sync in ${CWD} ?`);

    if (GITHUB_ORGA === undefined) {
        throw new Error(".env file must contain a field GITHUB_ORGA=yourOrganisation");
    }

    const spinner = new Spinner({
        prefixText: cyan().bold(`Search repositories for ${GITHUB_ORGA}`)
    }).start("Work");

    const [remote, reposLocalSet] = await Promise.all([
        repos(GITHUB_ORGA, await getToken()),
        reposLocalFiltered()
    ]);
    remote.forEach((repo) => {
        repo.name = repo.name.toLowerCase();
    });

    const searchPlatform = await Promise.all(
        remote.map(readTomlRemote)
    );
    searchPlatform.filter((repo) => repo !== false)
        .map((repo) => EXCLUDES_REPOS.add(repo));

    const reposRemoteArray = remote
        .filter(({ name, archived }) => !reposLocalSet.has(name) && !EXCLUDES_REPOS.has(name) && !archived)
        .map(({ name }) => name)
        // For tests
        // .filter((repo) => repo.length <= 3);
    spinner.succeed(`${reposRemoteArray.length} repositories found ==> \n`);

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
    const spin = new Spinner({
        prefixText: cyan().bold("Search update for local repositories.")
    }).start("Wait");

    reposLocalArray = [];
    reposLocalSet.forEach((repo) => reposLocalArray.push(repo));
    const repoNoUpdate = await Promise.all(
        reposLocalArray.map(logRepoLocAndRemote)
    );
    repoNoUpdateFiltered = repoNoUpdate.filter((repoName) => repoName !== false);
    spin.succeed(`${repoNoUpdateFiltered.length} found\n`);

    pullRepositories : if (repoNoUpdateFiltered.length > 0) {
        const sentence = [
            `\n- ${repoNoUpdateFiltered.join("\n- ")}\n\n`,
            "The above repoitories doesn't update. Do you want update them ?`"
        ].join("");
        const force = await question(sentence, "force");
        if (!force) {
            break pullRepositories;
        }

        await Promise.all(
            repoNoUpdateFiltered.map((repoName) => pullMaster(repoName, true))
        );
    }
}

module.exports = install;

