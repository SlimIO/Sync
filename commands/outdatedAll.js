// Require Node.js Dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;
const { performance } = require("perf_hooks");

// Require Third-party dependencies
const outdated = require("fast-outdated");
const { red, green, yellow, cyan, grey, white } = require("kleur");
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
        const recap = { name: repo, major: 0, minor: 0, patch: 0 };
        const dataPkg = await outdated(join(CWD, repo), {
            devDependencies: true,
            token: NPM_TOKEN
        });

        // console.log(dataPkg);
        for (const { current, latest } of Object.values(dataPkg)) {
            // console.log(diff(cleanRange(current), latest));
            recap[diff(cleanRange(current), latest)] += 1;
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
    const start = performance.now();
    const spin = new Spinner({
        prefixText: "Searching for outdated dependencies in sub directories"
    }).start("");

    const reposCWD = await readdir(CWD);
    const getRepoWithToml = (
        await Promise.all(reposCWD.map(getSlimioToml))
    ).filter((name) => name !== false);

    const ret = (
        await Promise.all(getRepoWithToml.map(getMinorAndMajor))
    ).sort((a, b) => b.major - a.major || b.minor - a.minor);
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

        const majorCount = `${ripit(3, major)}${major > 0 ? red().bold(major) : grey().bold("0")}`;
        const minorCount = `${ripit(5, minor)}${minor > 0 ? yellow().bold(minor) : grey().bold("0")}`;
        const patchCount = `${ripit(5, patch)}${patch > 0 ? white().bold(patch) : grey().bold("0")}`;
        console.log(` ${green(name)}${ripit(mxLenRep, name)} ${majorCount}   ${minorCount}   ${patchCount}`);
        console.log(grey().bold(` ${"-".repeat(mxLenRep + 22)}`));
    }
}

module.exports = outdatedAll;
