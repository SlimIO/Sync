"use strict";

// Require Node.js Dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;

// Require Third-party dependencies
const { outdated, clearCache } = require("fast-outdated");
const { red, green, yellow, cyan, gray, white } = require("kleur");
const { diff } = require("semver");
const Spinner = require("@slimio/async-cli-spinner");

// Require Internal Dependencies
const { getSlimioToml } = require("../src/utils");
const CLITable = require("../src/cli-table.js");

// CONSTANTS
const CWD = process.cwd();
const NPM_TOKEN = process.env.NPM_TOKEN;

// Vars
const ul = white().bold().underline;
Spinner.DEFAULT_SPINNER = "dots";

/**
 * @async
 * @function getMinorAndMajor
 * @param {!string} repo Repository name
 * @returns {Promise<{name, major, minor} | {name, err}>}
 */
async function getMinorAndMajor(repo) {
    try {
        const recap = { name: repo, major: 0, minor: 0, patch: 0 };
        const dataPkg = await outdated(join(CWD, repo), {
            devDependencies: true,
            token: NPM_TOKEN
        });

        for (const { current, latest } of Object.values(dataPkg)) {
            recap[diff(current, latest)] += 1;
        }

        return recap;
    }
    catch (error) {
        return { name: repo, err: error.message };
    }
}

/**
 * @async
 * @function outdatedAll
 * @description Log datas in the console
 * @returns {Promise<void>}
 */
async function outdatedAll() {
    const spin = new Spinner({
        prefixText: "Searching for outdated dependencies in sub directories"
    }).start("");

    const reposCWD = await readdir(CWD);
    const getRepoWithToml = (
        await Promise.all(reposCWD.map(getSlimioToml))
    ).filter((name) => name !== false);

    clearCache();
    const ret = (
        await Promise.all(getRepoWithToml.map(getMinorAndMajor))
    ).sort((left, right) => right.major - left.major || right.minor - left.minor);
    spin.succeed(
        `Fetched ${green().bold(ret.length)} repositories in ${cyan().bold(spin.elapsedTime.toFixed(2))} millisecondes !`
    );

    const table = new CLITable([
        CLITable.create(ul("Repository"), 25),
        ul("Major"),
        ul("Minor"),
        ul("Patch")
    ]);
    for (const { name, major, minor, patch, err } of ret) {
        if (err) {
            setImmediate(() => console.log(` ${red(name)} ${white().bold(err)}`));
            continue;
        }
        if (minor === 0 && major === 0 && patch === 0) {
            continue;
        }

        const majorCount = major > 0 ? red().bold(major) : gray().bold("0");
        const minorCount = minor > 0 ? yellow().bold(minor) : gray().bold("0");
        const patchCount = patch > 0 ? white().bold(patch) : gray().bold("0");
        table.add([green(name), majorCount, minorCount, patchCount]);
    }
    table.show();
}

module.exports = outdatedAll;
