"use strict";

// Require Third Party dependencies
const { cyan, white } = require("kleur");
const Lock = require("@slimio/lock");
const Spinner = require("@slimio/async-cli-spinner");

// Vars
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const question = require("../src/question");
const {
    getToken,
    logRepoLocAndRemote,
    pullMaster,
    reposLocalFiltered
} = require("../src/utils");

// CONSTANTS
const ALLOW_TOML = typeof process.env.TOML === "undefined" ? false : process.env.TOML === "true";

/**
 * @async
 * @function update
 * @description Update local repositories!
 * @param {Set<string>} pick A list of picked projects!
 * @returns {Promise<void>}
 */
async function update(pick) {
    const token = await getToken();
    const remoteRepositories = await reposLocalFiltered(ALLOW_TOML);
    if (remoteRepositories.size === 0) {
        console.log("No repository to update\n");
        process.exit(1);
    }

    const spin = new Spinner({
        prefixText: white().bold("Searching outdated git repositories.")
    }).start();

    const repoWithNoUpdate = (await Promise.all(
        [...remoteRepositories.repos].map((repoName) => logRepoLocAndRemote(repoName))
    )).filter((repoName) => repoName !== false);
    spin.succeed(`${cyan().bold(repoWithNoUpdate.length)} repositories that need to be updated!`);

    if (repoWithNoUpdate.length === 0) {
        console.log("No repositories to update!");

        return;
    }

    // eslint-disable-next-line
    const force = await question(`\n- ${repoWithNoUpdate.join("\n- ")}\n\nAbove repositories have their local master beyond origin/master. Do you want to pull?`, true);
    if (!force) {
        return;
    }

    const startNpmInstall = await question("Do you want to run 'npm install' after each pull ?", true);

    const locker = new Lock({ maxConcurrent: startNpmInstall ? 3 : 8 });
    await Promise.allSettled(
        repoWithNoUpdate.map((repoName) => pullMaster(repoName, {
            needSpin: true, startNpmInstall, token, locker
        }))
    );
}

module.exports = update;

