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

const FILTER_DISPLAY = ["greenkeeper[bot]", "snyk-bot"];

/**
 * @async
 * @function git
 * @description retrieve git stats
 * @param {*} options Every options in command
 * @returns {Promise<void>}
 */
async function git(options) {
    const start = performance.now();
    const spin = new Spinner({
        prefixText: "Retrieving git stats for current organization"
    }).start("");

    const ret = await request(options);

    const end = cyan().bold((performance.now() - start).toFixed(2));

    spin.succeed(
        `Successfully handled ${green().bold(ret.length)} repositories in ${end} millisecondes !`
    );
    const mxLenRep = 30;

    const ul = white().bold().underline;
    console.log(
        `\n ${ul("Repository")}${" ".repeat(mxLenRep - 11)} ${ul("Issues")}${" ".repeat(mxLenRep - 11)} ${ul("Pull Request")}\n`
    );

    for (const { full_name, issues, pull_requests: pr } of ret) {
        if (issues === 0 && pr.length === 0) {
            continue;
        }

        const rip = ripit(mxLenRep, full_name);

        console.log(
            `${green(full_name)} ${rip} ${yellow().bold(issues)} ${" ".repeat(23)} ${yellow().bold(pr.length)}`
        );
        console.log(gray().bold(` ${"-".repeat(mxLenRep + 42)}`));
    }
}


/**
 * @async
 * @function request
 * @description retrieve pull request stats (issues, pull request, name)
 * @param {*} options Filter option
 * @returns {Array<Promise<void>>}
 */
async function request(options) {
    const token = await getToken();
    const ret = (await Promise.all((await fetch(GITHUB_ORGA, { ...token, kind: "orgs" })).map(map))).sort(sort);

    return options ? ret : ret.map(filter);
}

/**
 * @function filter
 * @param {*} data the data to filter
 * @returns {boolean} filter or no
 */
function filter({ full_name, issues, pull_requests: prs }) {
    return { full_name, pull_requests: prs.filter((pr) => !FILTER_DISPLAY.includes(pr)), issues };
}

/**
 * @function sort
 * @description Sort array with issue - pull_requests
 * @param {object} left
 * @param {object} right
 * @returns {object}
 */
function sort(left, right) {
    return right.issues - left.issues || right.pull_requests - left.pull_requests;
}

/**
 * @async
 * @function map
 * @description retrieve information and create an object
 * @returns {object}
 */
async function map({ full_name, pulls_url, open_issues }) {
    const pull = pulls_url.slice(0, pulls_url.length - 9);

    const { data } = await http.get(pull, {
        headers: {
            "User-Agent": GITHUB_ORGA, Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github.v3.raw"
        }
    });

    return { full_name, pull_requests: data.length === 0 ? [] : data.map(({ user }) => user.login), issues: open_issues };
}

module.exports = git;
