"use strict";

// Require Node.js Dependencies
const { performance } = require("perf_hooks");

// Require Third-party dependencies
const { green, yellow, gray, white, cyan } = require("kleur");
const { fetch } = require("fetch-github-repositories");
const http = require("httpie");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const { getToken, ripit, wordMaxLength } = require("../src/utils");

// CONSTANTS
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

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
        await fetch(GITHUB_ORGA, { ...token, kind: "orgs" })
    ).sort((left, right) => right.open_issues - left.open_issues);

    const end = cyan().bold((performance.now() - start).toFixed(2));
    spin.succeed(
        `Successfully handled ${green().bold(ret.length)} repositories in ${end} millisecondes !`
    );
    const mxLenRep = 30;

    const ul = white().bold().underline;
    console.log(`\n ${ul("Repository")}${" ".repeat(mxLenRep - 11)} ${ul("Issues")}${" ".repeat(mxLenRep - 11)} ${ul("Pull Request")}\n`);

    for (const { full_name, issues, pull_requests } of await request()) {
        if (issues === 0 && pull_requests === 0) {
            continue
        }

        console.log(`${ green(full_name) } ${ ripit(mxLenRep, full_name) } ${ yellow().bold(issues) } ${ ' '.repeat(23) } ${ yellow().bold(pull_requests) }`)
        console.log(gray().bold(` ${ '-'.repeat(mxLenRep + (14 * 3)) }`));
    }

}


/**
 * @async
 * @function request
 * @description retrieve pull request stats (issues, pull request, name)
 * @returns {Array<Promise<void>>}
 */
async function request () {
    const token = await getToken()
    return (await Promise.all((await fetch(GITHUB_ORGA, { ...token, king: 'orgs' })).map(map))).sort(sort)
}

/**
 * @function sort
 * @description Sort array with issue - pull_requests
 * @param {Object} left 
 * @param {Object} right 
 */
function sort (left, right) {
    return right.issues - left.issues || right.pull_requests - left.pull_requests
}   

/**
 * @async
 * @function map
 * @description retrieve information and create an object
 * @return {Object}
 */
async function map ({ full_name, pulls_url, open_issues }) {
    const pull = pulls_url.slice(0, pulls_url.length - 9)

    const { data } = await http.get(pull, {
        headers: {
            "User-Agent": GITHUB_ORGA, Authorization: `token ${ GITHUB_TOKEN }`, Accept: "application/vnd.github.v3.raw"
        }
    })

    return ({ full_name, pull_requests: data.length, issues: open_issues })
}

module.exports = git;
