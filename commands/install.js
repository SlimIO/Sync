#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { readdir, stat } = require("fs").promises;
const { performance } = require("perf_hooks");

// Require Third Party dependencies
const repos = require("repos");
const { cyan, red, yellow, green, white } = require("kleur");
const qoa = require("qoa");
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
const EXCLUDES_REPOS = new Set(["governance", "n-api-ci", "blog"]);

/**
 * @async
 * @func question
 * @desc Question for the user
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
 * @func reposLocalFiltered
 * @desc Filters local repositories
 * @param {Boolean} [searchForToml=true] search for a .toml file at the root of each directories
 * @returns {Set<String>}
 */
async function reposLocalFiltered(searchForToml = true) {
    const localDir = await readdir(CWD);
    const reposLocalStat = await Promise.all(localDir.map((name) => stat(join(CWD, name))));
    const reposLocal = localDir
        .filter((name, idx) => reposLocalStat[idx].isDirectory())
        .map((name) => name.toLowerCase());

    if (!searchForToml) {
        return new Set(reposLocal);
    }

    const result = await Promise.all(reposLocal.map((name) => getSlimioToml(name)));

    return new Set(result.filter((name) => name !== false));
}

/**
 * @async
 * @func updateRepositories
 * @desc pull and update repositories
 * @param {String[]} localRepositories local repositories
 * @returns {Promise<void>}
 */
async function updateRepositories(localRepositories) {
    console.log("");
    const spin = new Spinner({
        prefixText: cyan().bold("Searching for update in local repositories.")
    }).start("Wait");

    const repoWithNoUpdate = (await Promise.all(
        localRepositories.map(logRepoLocAndRemote)
    )).filter((repoName) => repoName !== false);
    spin.succeed(`${repoWithNoUpdate.length} must be updated!\n`);

    pullRepositories : if (repoWithNoUpdate.length > 0) {
        const force = await question(
            `\n- ${repoWithNoUpdate.join("\n- ")}\n\nThe above repoitories doesn't update. Do you want update them ?`, "force");
        if (!force) {
            break pullRepositories;
        }

        await Promise.all(repoWithNoUpdate.map((repoName) => pullMaster(repoName, true)));
    }
}

/**
 * @async
 * @func install
 * @desc Clone - pull master and installing dependencies for the all projects SlimIO
 * @returns {Promise<void>}
 */
async function install() {
    if (typeof GITHUB_ORGA === "undefined") {
        throw new Error(".env file must contain a field GITHUB_ORGA=yourOrganisation");
    }
    await question(`Do you want execut Sync in ${CWD} ?`);
    console.log("");

    // Start a spinner
    const fetchTimer = performance.now();
    const spinner = new Spinner({
        prefixText: white().bold(`Fetching ${cyan().bold(GITHUB_ORGA)} repositories`)
    }).start("Work");

    // Retrieve local and remote repositories
    const [remote, reposLocalSet] = await Promise.all([
        repos(GITHUB_ORGA, await getToken()),
        reposLocalFiltered()
    ]);
    const filteredRemote = remote.filter((row) => !row.archived).map((row) => row.name.toLowerCase());

    // Remove specific projects depending on the current OS
    try {
        (await Promise.all(filteredRemote.map(readTomlRemote)))
            .filter((repo) => repo !== false)
            .map((repo) => EXCLUDES_REPOS.add(repo));
    }
    catch (err) {
        // Ignore
    }

    // Filter to retrieve repositories that are not cloned in locals
    const remoteToClone = remote.filter((name) => !reposLocalSet.has(name) && !EXCLUDES_REPOS.has(name));

    const fetchTime = cyan().bold(`${(performance.now() - fetchTimer).toFixed(2)}`);
    spinner.succeed(`Successfully fetched ${green().bold(remoteToClone.length)} repositories in ${fetchTime} milliseconds.\n`);
    console.log(white().bold(" > Cloning all fetched repositories\n"));

    // Clone and install projects
    await Promise.all(remoteToClone.map((repos, index) => cloneRepo(repos, index)));

    // Update repositories
    await updateRepositories([...reposLocalSet]);
}

module.exports = install;

