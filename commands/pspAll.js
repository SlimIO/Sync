// Require Third-party dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;
const psp = require("@slimio/psp");
const { red, green, yellow, cyan, white, underline: ul } = require("kleur");

// Require Internal Dependencies
const { getSlimioToml, ripit, wordMaxLength } = require("../src/utils");

// Constants
const CWD = process.cwd();

/**
 * @async
 * @func pspTheRepo
 * @desc Active psp in the folder
 * @param {!String} repo Name of the local repository
 * @returns {Promise<{name, warn, crit}>}
 */
async function pspTheRepo(repo) {
    try {
        const { warn, crit } = await psp({
            CWD: join(CWD, repo),
            forceMode: true,
            isCLI: false,
            verbose: false
        });

        return { name: repo, warn, crit };
    }
    catch (error) {
        return { name: repo, err: error.message };
    }
}

/**
 * @async
 * @func pspAll
 * @desc Active psp in the folder
 * @returns {Promise<void>}
 */
async function pspAll() {
    const reposCWD = await readdir(CWD);
    const getRepoWithToml = (
        await Promise.all(reposCWD.map(getSlimioToml))
    ).filter((name) => name !== false);

    const ret = (
        await Promise.all(getRepoWithToml.map(pspTheRepo))
    ).sort((a, b) => b.crit - a.crit);
    const mxLenRep = wordMaxLength(getRepoWithToml) || 30;

    console.log(`\n ${ul("Repository:")}${" ".repeat(mxLenRep - 11)} ${ul("Crit:")}   ${ul("Warn:")}\n`);
    for (const { name, crit, warn, err } of ret) {
        if (err) {
            setImmediate(() => {
                console.log(` ${red(name)}${ripit(mxLenRep, name)} ${white().bold(err)}`);
            });
            continue;
        }

        if (warn === 0 && crit === 0) {
            continue;
        }

        const warnCount = `${ripit(5, warn)}${warn > 0 ? yellow().bold(warn) : white().bold(warn)}`;
        const critCount = `${ripit(5, crit)}${crit > 0 ? red().bold(crit) : white().bold(crit)}`;
        console.log(` ${green(name)}${ripit(mxLenRep, name)} ${critCount}  ${warnCount}`);
    }
}


module.exports = pspAll;
