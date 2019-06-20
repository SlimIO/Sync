// Require Third-party dependencies
const { join } = require("path");
const { readdir, access } = require("fs").promises;
const outdated = require("fast-outdated");
const { red, green, yellow, cyan, gray } = require("kleur");
const { diff } = require("semver");

// Require Internal Dependencies
const { getSlimioToml } = require("../src/utils");

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
 * @func wordLength
 * @desc Analyze a array and find the longest string
 * @param {string[]} arrayString Array to analyze
 * @param {string} target Target for minor or major of the ret Object, value = min or maj
 * @return {number}
 */
function wordLength(arrayString = [], target) {
    if (target === "min") {
        return arrayString.sort((a, b) => a.minor.length - b.minor.length).pop().length;
    }

    if (target === "maj") {
        return arrayString.sort((a, b) => a.major.length - b.major.length).pop().length;
    }

    return arrayString.sort((a, b) => a.length - b.length).pop().length;
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
    console.log(`\n > Executing ${yellow("slimio-sync psp")} at: ${cyan().bold(CWD)}\n`);

    const reposCWD = await readdir(CWD);
    const getRepoWithToml = await Promise.all(reposCWD.map(getSlimioToml));

    const ret = await Promise.all(
        getRepoWithToml.filter((name) => name !== false).map(getMinorAndMajor)
    );

    const maxLenRepo = wordLength(getRepoWithToml);
    const maxLenMin = wordLength(ret, "min");
    const maxLenMaj = wordLength(ret, "maj");

    for (const { name, major, minor, err } of ret) {
        if (err) {
            console.log(`${red(name)} : Error => ${err}`);
            continue;
        }

        if (minor === 0 && major === 0) {
            continue;
        }

        const repo = `${green(name)}${" ".repeat(maxLenRepo - name.length)}`;
        const min = `${gray("Minor:")} ${yellow(minor)},${" ".repeat(maxLenMin - minor.length)}`;
        console.log(`${repo} ${min}  ${gray("Major:")} ${red(major)}`);
    }
}

module.exports = outdatedAll;
