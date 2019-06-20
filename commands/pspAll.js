// Require Third-party dependencies
const { join } = require("path");
const { readdir } = require("fs").promises;
const psp = require("@slimio/psp");
const { red, green, yellow, cyan, underline: ul } = require("kleur");

// Require Internal Dependencies
const { getSlimioToml, wordLength } = require("../src/utils");

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
    console.log(`\n > Executing ${yellow("slimio-sync psp")} at: ${cyan().bold(CWD)}\n`);

    reposCWD = await readdir(CWD);
    const getRepoWithToml = await Promise.all(reposCWD.map(getSlimioToml));

    const ret = await Promise.all(
        getRepoWithToml.filter((name) => name !== false).map(pspTheRepo)
    );

    const mxLenRep = wordLength(getRepoWithToml);
    const reject = [];
    console.log(`\n${ul("Repository:")}${" ".repeat(mxLenRep - 11)} ${ul("Warn:")}   ${ul("Crit:")}\n`);
    for (const { name, crit, warn, err } of ret) {
        if (err) {
            reject.push(`${red(name)} : Error => ${err}`);
            continue;
        }

        if (warn === 0 && crit === 0) {
            continue;
        }

        const repo = `${green(name)}${" ".repeat(mxLenRep - name.length)}`;
        const min = `${" ".repeat(5 - warn.toString().length)}${warn > 0 ? yellow(warn) : warn}`;
        console.log(`${repo} ${min}  ${" ".repeat(5 - crit.toString().length)} ${crit > 0 ? red(crit) : crit}`);
    }
    reject.forEach((err) => console.log(err));
}


module.exports = pspAll;
