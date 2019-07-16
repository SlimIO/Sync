"use strict";

// Require Node.js Dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;
const { performance } = require("perf_hooks");

// Require Third-party dependencies
const psp = require("@slimio/psp");
const { red, green, yellow, grey, white, cyan } = require("kleur");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const { getSlimioToml, ripit, wordMaxLength } = require("../src/utils");

// CONSTANTS
const CWD = process.cwd();

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
 * @returns {Promise<void>}
 */
async function pspAll() {
    const start = performance.now();
    const spin = new Spinner({
        prefixText: "Retrieving psp reports on all sub directories"
    }).start("");

    const reposCWD = await readdir(CWD);
    const getRepoWithToml = (
        await Promise.all(reposCWD.map(getSlimioToml))
    ).filter((name) => name !== false);

    const ret = (
        await Promise.all(getRepoWithToml.map(pspTheRepo))
    ).sort((left, right) => right.crit - left.crit || right.warn - left.warn);

    const end = cyan().bold((performance.now() - start).toFixed(2));
    spin.succeed(
        `Successfully handled ${green().bold(ret.length)} repositories in ${end} millisecondes !`
    );
    const mxLenRep = wordMaxLength(getRepoWithToml) || 30;

    const ul = white().bold().underline;
    console.log(`\n ${ul("Repository")}${" ".repeat(mxLenRep - 11)} ${ul("Crit")}     ${ul("Warn")}\n`);
    for (const { name, crit, warn, err } of ret) {
        if (err) {
            setImmediate(() => {
                console.log(` ${red(name)}${ripit(mxLenRep, name)} ${white().bold(err)}`);
            });
            continue;
        }

        if (warn === 0 && crit === 0) {
            continue;
        }

        const warnCount = `${ripit(9, warn)}${warn > 0 ? yellow().bold(warn) : grey().bold("0")}`;
        const critCount = `${ripit(3, crit)}${crit > 0 ? red().bold(crit) : grey().bold("0")}`;
        console.log(` ${green(name)}${ripit(mxLenRep, name)}${critCount}${warnCount}`);
        console.log(grey().bold(` ${"-".repeat(mxLenRep + 14)}`));
    }
}


module.exports = pspAll;
