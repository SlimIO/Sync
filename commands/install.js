"use strict";

// Require Node.js dependencies
const { join } = require("path");
const { rmdir } = require("fs").promises;

// Require Third Party dependencies
const { fetch } = require("fetch-github-repositories");
const { cyan, yellow, green, gray, white } = require("kleur");
const ms = require("ms");
const Spinner = require("@slimio/async-cli-spinner");

// Vars
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const question = require("../src/question");
const RemoteRepositories = require("../src/RemoteRepositories");
const {
    cloneRepo,
    getToken,
    readTomlRemote,
    reposLocalFiltered,
    loadLocalConfig
} = require("../src/utils");

/**
 * @async
 * @function install
 * @description Clone - pull master and installing dependencies for the all projects SlimIO
 * @param {boolean} [noInstall=false] Skip npm installation
 * @param {Set<string>} pick A list of picked projects!
 * @returns {Promise<void>}
 *
 * @throws {Error}
 */
async function install(noInstall = false, pick) {
    await question(`Do you want to execute Sync at: ${process.cwd()}?`);
    console.log("");

    const config = await loadLocalConfig();
    const token = config.github_token || await getToken();

    // Start Spinner
    const spinner = new Spinner({
        prefixText: white().bold(`Fetching ${cyan().bold(config.github_orga)} repositories.`)
    }).start();

    // Retrieve local and remote repositories
    const [remote, reposLocalSet] = await Promise.all([
        fetch(config.github_orga, { ...token, kind: config.github_kind }),
        reposLocalFiltered(config.toml)
    ]);
    const filteredRemote = remote.filter((row) => !row.archived).map((row) => row.name);

    const remoteSet = new RemoteRepositories(filteredRemote);
    const repoListOpt = new RemoteRepositories(pick.size > 0 ?
        [...pick].map((repo) => remoteSet.matchingName(repo)).filter((repo) => repo !== null) : filteredRemote);

    // Remove local pick
    if (pick.size > 0) {
        const reposToDelete = new Set([...repoListOpt.repos, ...pick]);

        await Promise.all([...reposToDelete].map((name) => rmdir(join(process.cwd(), name), { recursive: true })));
    }

    // Remove specific projects depending on the current OS
    const skipInstallation = new Set();
    if (config.toml) {
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
    const remoteToClone = filteredRemote
        .filter((name) => !reposLocalSet.has(name) && !config.exclude_repos.has(name.toLowerCase()))
        .filter((name) => repoListOpt.has(name.toLowerCase()));

    const fetchTime = cyan().bold(ms(spinner.elapsedTime, { long: true }));
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
}

module.exports = install;

