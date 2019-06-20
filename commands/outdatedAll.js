// Require Third-party dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;
const outdated = require("fast-outdated");
const { red, green, yellow, cyan, underline: ul } = require("kleur");
const { diff } = require("semver");

// Require Internal Dependencies
const { getSlimioToml, wordLength } = require("../src/utils");

// Constants
const CWD = process.cwd();
const NPM_TOKEN = process.env.NPM_TOKEN;

/**
 * @func cleanRange
 * @desc Clean version
 * @param {!string} version Current version
 * @returns {string}
 */
function cleanRange(version) {
    const firstChar = version.charAt(0);
    if (firstChar === "^" || firstChar === "<" || firstChar === ">" || firstChar === "=") {
        return version.slice(version.charAt(1) === "=" ? 2 : 1);
    }

    return version;
}

/**
 * @async
 * @func getMinorAndMajor
 * @param {!String} repo Repository name
 * @returns {Promise<{name, major, minor} | {name, err}>}
 */
async function getMinorAndMajor(repo) {
    try {
        const recap = { name: repo, major: 0, minor: 0 };
        const dataPkg = await outdated(join(CWD, repo), {
            devDependencies: true,
            token: NPM_TOKEN
        });

        for (const { current, latest } of Object.values(dataPkg)) {
            recap[diff(cleanRange(current), latest) === "major" ? "major" : "minor"] += 1;
        }

        return recap;
    }
    catch (error) {
        return { name: repo, err: error.message };
    }
}

/**
 * @async
 * @func outdatedAll
 * @desc Log datas in the console
 * @returns {Promise<void>}
 */
async function outdatedAll() {
    console.log(`\n > Executing ${yellow("slimio-sync outdated")} at: ${cyan().bold(CWD)}\n`);

    const reposCWD = await readdir(CWD);
    const getRepoWithToml = await Promise.all(reposCWD.map(getSlimioToml));

    const ret = await Promise.all(
        getRepoWithToml.filter((name) => name !== false).map(getMinorAndMajor)
    );

    const mxLenRep = wordLength(getRepoWithToml);
    console.log(`\n${ul("Repository:")}${" ".repeat(mxLenRep - 11)} ${ul("Minor:")}   ${ul("Major:")}\n`);
    for (const { name, major, minor, err } of ret) {
        if (err) {
            console.log(`${red(name)} : Error => ${err}`);
            continue;
        }

        if (minor === 0 && major === 0) {
            continue;
        }

        const repo = `${green(name)}${" ".repeat(mxLenRep - name.length)}`;
        const min = `${" ".repeat(5 - minor.toString().length)}${minor > 0 ? yellow(minor) : minor}`;
        console.log(`${repo} ${min}   ${" ".repeat(5 - major.toString().length)} ${major > 0 ? red(major) : major}`);
    }
}

module.exports = outdatedAll;
