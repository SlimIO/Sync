#!/usr/bin/env node
"use strict";

// Require Node.js dependencies
const { join } = require("path");
const { readdir, stat } = require("fs").promises;
const { performance } = require("perf_hooks");

// Require Third Party dependencies
const fetchGithubRepositories = require("fetch-github-repositories");
const premove = require("premove");
const { cyan, red, yellow, green, gray, white } = require("kleur");
const qoa = require("qoa");
const Lock = require("@slimio/lock");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const {
    cloneRepo,
    getToken,
    logRepoLocAndRemote,
    pullMaster,
    readTomlRemote,
    getSlimioToml
} = require("../src/utils");

// CONSTANTS
const CWD = process.cwd();
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const ALLOW_TOML = typeof process.env.TOML === "undefined" ? false : process.env.TOML === "true";
const EXCLUDES_REPOS = new Set(["governance", "n-api-ci", "blog"]);

/**
 * @async
 * @function question
 * @description Question for the user
 * @param {!string} sentence Sentence
 * @param {boolean} [force=false] Allows not exit even in case of negative respone
 * @returns {void|boolean}
 */
async function question(sentence, force = false) {
    const { validQuestion } = await qoa.confirm({
        type: "confirm",
        accept: "y",
        deny: "n",
        handle: "validQuestion",
        query: yellow(sentence)
    });

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
 * @function reposLocalFiltered
 * @description Filters local repositories
 * @param {boolean} [searchForToml=true] search for a .toml file at the root of each directories
 * @returns {Set<string>}
 */
async function reposLocalFiltered(searchForToml = true) {
    const localDir = await readdir(CWD);
    const reposLocalStat = await Promise.all(localDir.map((name) => stat(join(CWD, name))));
    const reposLocal = localDir
        .filter((name, idx) => reposLocalStat[idx].isDirectory());

    if (!searchForToml || !ALLOW_TOML) {
        return new Set(reposLocal);
    }

    const result = await Promise.all(reposLocal.map((name) => getSlimioToml(name)));

    return new Set(result.filter((name) => name !== false));
}

/**
 * @async
 * @function updateRepositories
 * @description pull and update repositories
 * @param {string[]} localRepositories local repositories
 * @param {object} token token
 * @returns {Promise<void>}
 */
async function updateRepositories(localRepositories, token) {
    if (localRepositories.length === 0) {
        console.log("No repository to update\n");
        process.exit(1);
    }

    const spin = new Spinner({
        prefixText: white().bold("Searching outdated git repositories.")
    }).start();

    const repoWithNoUpdate = (await Promise.all(
        localRepositories.map(logRepoLocAndRemote)
    )).filter((repoName) => repoName !== false);
    spin.succeed(`${cyan().bold(repoWithNoUpdate.length)} repositories that need to be updated!`);

    pullRepositories : if (repoWithNoUpdate.length > 0) {
        // eslint-disable-next-line
        const force = await question(`\n- ${repoWithNoUpdate.join("\n- ")}\n\nAbove repositories have their local master beyond origin/master. Do you want to pull?`, true);
        if (!force) {
            break pullRepositories;
        }

        const startNpmInstall = await question("Do you want to run 'npm install' after each pull ?", true);
        const locker = new Lock({ max: startNpmInstall ? 3 : 8 });
        // await Promise.all(
        //     repoWithNoUpdate.map((repoName) => pullMaster(repoName, { needSpin: true, startNpmInstall, token, locker }))
        // );
        const repoName = repoWithNoUpdate[0];
        pullMaster(repoName, { needSpin: true, startNpmInstall, token, locker });
    }
}

/**
 * @async
 * @function install
 * @description Clone - pull master and installing dependencies for the all projects SlimIO
 * @param {boolean} [update=false] Just for update
 * @param {boolean} [noInstall=false] Skip npm installation
 * @param {Set<string>} pick A list of picked projects!
 * @returns {Promise<void>}
 *
 * @throws {Error}
 */
async function install(update = false, noInstall = false, pick) {
    if (typeof GITHUB_ORGA === "undefined") {
        throw new Error(".env file must contain a field GITHUB_ORGA=yourOrganisation");
    }

    await question(`Do you want execut Sync in ${CWD} ?`);
    console.log("");

    // Start a spinner
    const fetchTimer = performance.now();
    const token = await getToken();

    // Cmd update
    if (update) {
        await updateRepositories([...await reposLocalFiltered()], token);

        return;
    }

    // Start Spinner
    const spinner = new Spinner({
        prefixText: white().bold(`Fetching ${cyan().bold(GITHUB_ORGA)} repositories.`)
    }).start();

    // Retrieve local and remote repositories
    const [remote, reposLocalSet] = await Promise.all([
        fetchGithubRepositories(GITHUB_ORGA, { ...token, kind: "orgs" }),
        reposLocalFiltered()
    ]);

    /** @type {Set<string>} */
    const remoteSet = new Set(remote.map((repo) => repo.name.toLowerCase()));

    /** @type {Set<string>} */
    const repoListOpt = pick.size > 0 ? new Set() : remoteSet;
    for (const repo of [...pick]) {
        if (remoteSet.has(repo)) {
            repoListOpt.add(repo);
        }
    }

    // Remove local pick
    if (pick.size > 0) {
        await Promise.all([...pick].map((name) => premove(join(CWD, name))));
    }

    // Remove specific projects depending on the current OS
    const skipInstallation = new Set();
    if (ALLOW_TOML && !update) {
        try {
            (await Promise.all(remote.map(readTomlRemote)))
                .filter((repo) => repo !== false)
                .map((repo) => skipInstallation.add(repo));
        }
        catch (err) {
            // Ignore
        }
    }

    // Filter to retrieve repositories that are not cloned in locals
    const remoteToClone = remote
        .filter((row) => !row.archived)
        .map((row) => row.name)
        .filter((name) => !reposLocalSet.has(name) && !EXCLUDES_REPOS.has(name.toLowerCase()))
        // Filter for dev
        .filter((name) => repoListOpt.has(name.toLowerCase()));

    const fetchTime = cyan().bold(`${((performance.now() - fetchTimer) / 1000).toFixed(2)}s`);
    spinner.succeed(`Successfully fetched ${green().bold(remoteToClone.length)} repositories in ${fetchTime}.\n`);

    console.log(white().bold(` > Number of local repositories: ${yellow().bold(reposLocalSet.size)}`));
    console.log(gray().bold("   ------------------------------------"));
    console.log(white().bold(" > Cloning all fetched repositories\n"));

    // Clone and install projects
    await Promise.all(
        remoteToClone.map((repoName) => cloneRepo(repoName, {
            skipInstall: skipInstallation.has(repoName) || noInstall,
            token
        }))
    );

    // Update repositories
    if (pick.size === 0) {
        console.log("");
        await updateRepositories([...reposLocalSet], token);
    }
}

module.exports = install;

