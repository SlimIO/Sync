#!/usr/bin/env node

// Require Node.js dependencies
const { join } = require("path");
const { readdir, stat } = require("fs").promises;
const { performance } = require("perf_hooks");

// Require Third Party dependencies
const repos = require("repos");
const { cyan, red, yellow, green, grey, white } = require("kleur");
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
    getSlimioToml,
    wordMaxLength
} = require("../src/utils");

// CONSTANTS
const CWD = process.cwd();
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const ALLOW_TOML = typeof process.env.TOML === "undefined" ? false : process.env.TOML === "true";
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
        .filter((name, idx) => reposLocalStat[idx].isDirectory());

    if (!searchForToml || !ALLOW_TOML) {
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
 * @param {Object} token token
 * @returns {Promise<void>}
 */
async function updateRepositories(localRepositories, token) {
    console.log("");
    const spin = new Spinner({
        prefixText: cyan().bold("Searching for update in local repositories.")
    }).start("Wait");

    const repoWithNoUpdate = (await Promise.all(
        localRepositories.map(logRepoLocAndRemote)
    )).filter((repoName) => repoName !== false);
    spin.succeed(`${repoWithNoUpdate.length} repositories found!\n`);

    pullRepositories : if (repoWithNoUpdate.length > 0) {
        const force = await question(
            `\n- ${repoWithNoUpdate.join("\n- ")}\n\nThe above repoitories doesn't update. Do you want update them ?`, "force");
        if (!force) {
            break pullRepositories;
        }

        await Promise.all(
            repoWithNoUpdate.map((repoName) => pullMaster(repoName, { needSpin: true, token }))
        );
    }
}

/**
 * @async
 * @func install
 * @desc Clone - pull master and installing dependencies for the all projects SlimIO
 * @param {boolean} update Just for update
 * @param {boolean | number} dev Just for clone
 * @returns {Promise<void>}
 */
async function install(update = false, dev = false) {
    if (typeof GITHUB_ORGA === "undefined") {
        throw new Error(".env file must contain a field GITHUB_ORGA=yourOrganisation");
    }
    if (typeof update !== "boolean") {
        throw new Error("-u or --update commands have not to need arguments.");
    }
    if (typeof dev !== "boolean" && typeof dev !== "number") {
        throw new Error("-d or --dev commands's argument must be a boolean or so nothing.");
    }
    nbFilterForDev = typeof dev === "number" ? dev : Infinity;

    await question(`Do you want execut Sync in ${CWD} ?`);
    console.log("");

    // Start a spinner
    const fetchTimer = performance.now();
    const token = await getToken();
    const spinner = new Spinner({
        prefixText: white().bold(`Fetching ${cyan().bold(GITHUB_ORGA)} repositories.`)
    });

    // Cmd update
    if (update) {
        await updateRepositories([...await reposLocalFiltered()], token);

        return;
    }
    // Start Spinner
    spinner.start("Work");
    // Retrieve local and remote repositories
    const [remote, reposLocalSet] = await Promise.all([
        repos(GITHUB_ORGA, token),
        reposLocalFiltered()
    ]);

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
        .filter((name, index) => index < nbFilterForDev);

    const fetchTime = cyan().bold(`${((performance.now() - fetchTimer) / 1000).toFixed(2)}s`);
    spinner.succeed(`Successfully fetched ${green().bold(remoteToClone.length)} repositories in ${fetchTime}.\n`);

    console.log(white().bold(` > Number of local repositories: ${yellow().bold(reposLocalSet.size)}`));
    console.log(grey().bold("   ------------------------------------"));
    console.log(white().bold(" > Cloning all fetched repositories\n"));

    // Clone and install projects
    const space = wordMaxLength(Array.from(remoteToClone));
    await Promise.all(
        remoteToClone.map((repoName) => cloneRepo(repoName, {
            skipInstall: skipInstallation.has(repoName),
            token, dev, space
        }))
    );
    // Update repositories
    if (!dev) {
        await updateRepositories([...reposLocalSet], token);
    }
}

module.exports = install;

