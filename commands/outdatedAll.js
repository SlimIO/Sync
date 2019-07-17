"use strict";

// Require Node.js Dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;
const { performance } = require("perf_hooks");

// Require Third-party dependencies
const { outdated, clearCache } = require("fast-outdated");
const { red, green, yellow, cyan, gray, white } = require("kleur");
const { diff } = require("semver");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const { getSlimioToml, ripit, wordMaxLength } = require("../src/utils");

// Constants
const CWD = process.cwd();
const NPM_TOKEN = process.env.NPM_TOKEN;

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
    const start = performance.now();
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
    const mxLenRep = wordMaxLength(getRepoWithToml) || 30;
    const end = performance.now() - start;
    spin.succeed(
        `Fetched ${green().bold(ret.length)} repositories in ${cyan().bold(end.toFixed(2))} millisecondes !`
    );

    const ul = white().bold().underline;
    console.log(`\n ${ul("Repository")}${" ".repeat(mxLenRep - 11)} ${ul("Major")}   ${ul("Minor")}   ${ul("Patch")}\n`);
    for (const { name, major, minor, patch, err } of ret) {
        if (err) {
            setImmediate(() => {
                console.log(` ${red(name)}${ripit(mxLenRep, name)} ${white().bold(err)}`);
            });
            continue;
        }

        if (minor === 0 && major === 0 && patch === 0) {
            continue;
        }

        const majorCount = `${ripit(3, major)}${major > 0 ? red().bold(major) : gray().bold("0")}`;
        const minorCount = `${ripit(5, minor)}${minor > 0 ? yellow().bold(minor) : gray().bold("0")}`;
        const patchCount = `${ripit(5, patch)}${patch > 0 ? white().bold(patch) : gray().bold("0")}`;
        console.log(` ${green(name)}${ripit(mxLenRep, name)} ${majorCount}   ${minorCount}   ${patchCount}`);
        console.log(gray().bold(` ${"-".repeat(mxLenRep + 22)}`));
    }
}

module.exports = outdatedAll;
