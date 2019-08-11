"use strict";

// Require Node.js Dependencies
const { performance } = require("perf_hooks");

// Require Third-party dependencies
const { red, green, yellow, gray, white, cyan } = require("kleur");
const fetchGithubRepositories = require("fetch-github-repositories");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const { getToken, ripit, wordMaxLength } = require("../src/utils");

// CONSTANTS
const GITHUB_ORGA = process.env.GITHUB_ORGA;

/**
 * @async
 * @function git
 * @description retrieve git stats
 * @returns {Promise<void>}
 */
async function git() {
    const start = performance.now();
    const spin = new Spinner({
        prefixText: "Retrieving git stats for current organization"
    }).start("");

    const token = await getToken();
    const ret = (
        await fetchGithubRepositories(GITHUB_ORGA, { ...token, kind: "orgs" })
    ).sort((left, right) => right.open_issues - left.open_issues);


    const end = cyan().bold((performance.now() - start).toFixed(2));
    spin.succeed(
        `Successfully handled ${green().bold(ret.length)} repositories in ${end} millisecondes !`
    );
    const mxLenRep = 30;

    const ul = white().bold().underline;
    console.log(`\n ${ul("Repository")}${" ".repeat(mxLenRep - 11)} ${ul("Issues")}\n`);
    for (const { full_name, open_issues: issues } of ret) {
        if (issues === 0) {
            continue;
        }

        const critCount = `${ripit(3, issues)}${issues > 0 ? yellow().bold(issues) : gray().bold("0")}`;
        console.log(` ${green(full_name)}${ripit(mxLenRep, full_name)}${critCount}`);
        console.log(gray().bold(` ${"-".repeat(mxLenRep + 14)}`));
    }
}


module.exports = git;
