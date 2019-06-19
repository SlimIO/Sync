// Require Third-party dependencies
const { join } = require("path");
const { readdir, access } = require("fs").promises;
const outdated = require("fast-outdated");
const { red, green, yellow, cyan, gray } = require("kleur");

// Require Internal Dependencies
const { getSlimioToml } = require("../src/utils");

// Constants
const CWD = process.cwd();

function parseSemver(dataPkg) {
    const { current, latest } = dataPkg;
    currentParsed = isNaN(parseFloat(current)) ? current.slice(1) : current;
    latestParsed = isNaN(parseFloat(latest)) ? latest.slice(1) : latest;

    return { current: currentParsed.split("."), latest: latestParsed.split(".") };
}

async function outdatedTheRepo(repo) {
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
            if (current[0] === 0 && latest[0] === 0) {
                if (current[1] < latest[1]) {
                    recap.major += 1;
                }
                if (current[2] < lastest[2]) {
                    recap.minor += 1;
                }
                continue;
            }

            if (current[0] < latest[0]) {
                recap.major += 1;
                continue;
            }

            if (current[0] === latest[0]) {
                if (current[1] < latest[1]) {
                    recap.minor += 1;
                    continue;
                }
                if (current[2] < latest[2]) {
                    recap.minor += 1;
                }
            }
        }

        return Object.assign({ name: repo }, recap);
    }
    catch (error) {
        return { name: repo, err: error.message };
    }
}

async function outdatedAll() {
    console.log(`\n > Executing ${yellow("slimio-sync psp")} at: ${cyan().bold(CWD)}\n`);

    reposCWD = await readdir(CWD);
    const getRepoWithToml = await Promise.all(
        reposCWD.map(getSlimioToml)
    );
    const reposSlimIO = getRepoWithToml.filter((name) => name !== false);

    const ret = await Promise.all(
        reposSlimIO.map(outdatedTheRepo)
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
