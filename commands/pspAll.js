// Require Third-party dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;
const psp = require("@slimio/psp");
const { red, green, yellow, cyan, gray } = require("kleur");

// Require Internal Dependencies
const { getSlimioToml } = require("../src/utils");

// Constants
const CWD = process.cwd();

/**
 * @async
 * @func pspTheRepo
 * @desc Active psp in the folder
 * @param {!String} repo Name of the local repository
 * @returns {Promise<void>}
 */
async function pspTheRepo(repo) {
    try {
        const { warn, crit } = await psp({
            CWD: join(CWD, repo),
            forceMode: true,
            isCLI: false,
            verbose: false
        });

        if (warn === 0 && crit === 0) {
            return;
        }
        const colorWarn = warn > 0 ? yellow(warn) : warn;
        const colorCrit = crit > 0 ? red(crit) : crit;
        console.log(`${green(repo)} : ${gray("warn =>")} ${colorWarn}, ${gray("crit =>")} ${colorCrit}`);
    }
    catch (error) {
        console.log(`${green(repo)} : ${red("Error")} => ${error.message}`);
    }
}

/**
 * @async
 * @func pspAll
 * @desc Active psp in the folder
 * @returns {Promise<void>}
 */
async function pspAll() {
    console.log(`\n > Executing ${yellow("slimio-sync psp")} at: ${cyan().bold(CWD)}\n`);

    reposCWD = await readdir(CWD);
    const getRepoWithToml = await Promise.all(
        reposCWD.map(getSlimioToml)
    );
    const reposSlimIO = getRepoWithToml.filter((name) => name !== false);

    await Promise.all(
        reposSlimIO.map(pspTheRepo)
    );
}


module.exports = pspAll;