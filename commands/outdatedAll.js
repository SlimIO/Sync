// Require Third-party dependencies
const { join } = require("path");
const { readdir, access } = require("fs").promises;
const outdated = require("fast-outdated");
const { red, green, yellow, cyan, gray } = require("kleur");

// Require Internal Dependencies
const { getSlimioToml } = require("../src/utils");

// Constants
const CWD = process.cwd();

async function outdatedTheRepo(repo) {
    try {
        const path = join(CWD, repo);
        access(join(path, "package.json"));

        const data = await outdated(path, {
            devDependencies: true,
            token: process.env.GITHUB_TOKEN
        });
        console.log(JSON.stringify(data, null, 4));
    }
    catch (error) {
        console.log(`${green(repo)} : ${red("Error")} => ${error.message}`);
    }
}

async function outdatedAll() {
    console.log(`\n > Executing ${yellow("slimio-sync psp")} at: ${cyan().bold(CWD)}\n`);

    reposCWD = await readdir(CWD);
    const getRepoWithToml = await Promise.all(
        reposCWD.map(getSlimioToml)
    );
    const reposSlimIO = getRepoWithToml.filter((name) => name !== false);

    await Promise.all(
        reposSlimIO.map(outdatedTheRepo)
    );
}

module.exports = outdatedAll;
