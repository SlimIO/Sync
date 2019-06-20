// Require Third-party dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;
const outdated = require("fast-outdated");
const { red, green, yellow, cyan, underline: ul } = require("kleur");
const { diff } = require("semver");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const { getSlimioToml, ripit, wordMaxLength } = require("../src/utils");

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
    const spinner = new Spinner({
        prefixText: "Outdated for each repository"
    }).start("Wait");

    const reposCWD = await readdir(CWD);
    const getRepoWithToml = await Promise.all(reposCWD.map(getSlimioToml));

    const ret = await Promise.all(
        getRepoWithToml.filter((name) => name !== false).map(getMinorAndMajor)
    );

    const mxLenRep = wordMaxLength(getRepoWithToml);
    const reject = [];
    console.log(`\n${ul("Repository:")}${" ".repeat(mxLenRep - 11)} ${ul("Minor:")}   ${ul("Major:")}\n`);
    for (const { name, major, minor, err } of ret) {
        if (err) {
            reject.push(`${red(name)} : Error => ${err}`);
            continue;
        }

        if (minor === 0 && major === 0) {
            continue;
        }

        const repo = `${green(name)}${ripit(mxLenRep, name)}`;
        const min = `${ripit(5, minor)}${minor > 0 ? yellow(minor) : minor}`;
        console.log(`${repo} ${min}   ${ripit(5, major)} ${major > 0 ? red(major) : major}`);
    }
    reject.forEach((err) => console.log(err));
    spinner.succeed("OK");
}

module.exports = outdatedAll;
