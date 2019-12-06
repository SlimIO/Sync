"use strict";

// Require Node.js Dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;

// Require Third-party dependencies
const psp = require("@slimio/psp");
const { red, green, yellow, gray, white, cyan } = require("kleur");
const Spinner = require("@slimio/async-cli-spinner");

// Require Internal Dependencies
const { getSlimioTomlEx } = require("../src/utils");
const CLITable = require("../src/cli-table.js");

// CONSTANTS & Vars
const CWD = process.cwd();
const ul = white().bold().underline;
Spinner.DEFAULT_SPINNER = "dots";

/**
 * @async
 * @function pspTheRepo
 * @description Active psp in the folder
 * @param {!string} repo Name of the local repository
 * @returns {Promise<{name, warn, crit}>}
 */
async function pspTheRepo(repo) {
    try {
        const { warn, crit } = await psp({
            CWD: join(CWD, repo),
            forceMode: true,
            isCLI: false,
            verbose: false
        });

        return { name: repo, warn, crit };
    }
    catch (error) {
        return { name: repo, err: error.message };
    }
}

/**
 * @async
 * @function pspAll
 * @description Active psp in the folder
 * @param {!number} minimumPerLine
 * @returns {Promise<void>}
 */
async function pspAll(minimumPerLine) {
    const spin = new Spinner({
        prefixText: "Retrieving psp reports on all sub directories"
    }).start("");

    const reposCWD = (await readdir(CWD, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    const getRepoWithToml = (await Promise.all(reposCWD.map(getSlimioTomlEx)))
        .filter((manifest) => manifest !== null && manifest.type !== "Degraded")
        .map((manifest) => manifest.original_dir);

    const ret = (
        await Promise.all(getRepoWithToml.map(pspTheRepo))
    ).sort((left, right) => right.crit - left.crit || right.warn - left.warn);

    const end = cyan().bold(spin.elapsedTime.toFixed(2));
    spin.succeed(`Successfully handled ${green().bold(ret.length)} repositories in ${end} millisecondes !`);

    const table = new CLITable([
        CLITable.create(ul("Repository"), 25),
        ul("Crit"),
        ul("Warn")
    ]);
    for (const { name, crit, warn, err } of ret) {
        if (err) {
            setImmediate(() => console.log(` ${red(name)} ${white().bold(err)}`));
            continue;
        }

        if (warn + crit < minimumPerLine) {
            continue;
        }

        const warnCount = warn > 0 ? yellow().bold(warn) : gray().bold("0");
        const critCount = crit > 0 ? red().bold(crit) : gray().bold("0");
        table.add([green(name), critCount, warnCount]);
    }
    table.show();
}


module.exports = pspAll;
