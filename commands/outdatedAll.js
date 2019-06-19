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

/**
 * @typedef {Object} dataPackage
 * @property {string} current Current version of the package
 * @property {string} latest latest version of the package
 */
/**
 * @func
 * @desc Parse string
 * @param {!dataPackage} dataPkg Data on a package
 * @returns {{current, latest}}
 */
function parseSemver(dataPkg) {
    const { current, latest } = dataPkg;
    currentParsed = isNaN(parseFloat(current)) ? current.slice(1) : current;
    latestParsed = isNaN(parseFloat(latest)) ? latest.slice(1) : latest;

    return { current: currentParsed, latest: latestParsed };
}

/**
 * @async
 * @func getMinorAndMajor
 * @param {!String} repo Repository name
 * @returns {Promise<{name, major, minor} | {name, err}>}
 */
async function getMinorAndMajor(repo) {
    const recap = { major: 0, minor: 0 };
    try {
        const path = join(CWD, repo);
        await access(join(path, "package.json"));

        const dataPkg = await outdated(path, {
            devDependencies: true,
            token: process.env.GITHUB_TOKEN
        });
        const packages = Object.keys(dataPkg);

        for (const pkg of packages) {
            const { current, latest } = parseSemver(dataPkg[pkg]);
            const getDiff = diff(current, latest);

            if (getDiff === "null") {
                continue;
            }
            else if (getDiff === "major") {
                recap.major += 1;
            }
            else {
                recap.minor += 1;
            }
        }

        return Object.assign({ name: repo }, recap);
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

    reposCWD = await readdir(CWD);
    const getRepoWithToml = await Promise.all(
        reposCWD.map(getSlimioToml)
    );
    const reposSlimIO = getRepoWithToml.filter((name) => name !== false);

    const ret = await Promise.all(
        reposSlimIO.map(getMinorAndMajor)
    );

    for (const { name, major, minor, err } of ret) {
        if (err) {
            console.log(`${red(name)} : Error => ${err}`);
            continue;
        }

        if (minor === 0 && major === 0) {
            continue;
        }
        const colorMin = minor > 0 ? yellow(minor) : minor;
        const colorMaj = major > 0 ? red(major) : major;
        console.log(`${green(name)} : ${gray("Minor =>")} ${colorMin}, ${gray("Major =>")} ${colorMaj}`);
    }
}

module.exports = outdatedAll;
