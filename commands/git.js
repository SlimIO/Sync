"use strict";

// Require Node.js Dependencies
const { performance } = require("perf_hooks");

// Require Third-party dependencies
const { green, yellow, gray, white, cyan, red } = require("kleur");
const { fetch } = require("fetch-github-repositories");
const http = require("httpie");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Require Internal Dependencies
const { getToken, ripit } = require("../src/utils");

// CONSTANTS
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FILTER_DISPLAY = new Set(["greenkeeper[bot]", "snyk-bot"]);

/**
 * @async
 * @function git
 * @description retrieve git stats
 * @param {!boolean} includeAllUsers include all github users
 * @returns {Promise<void>}
 */
async function git(includeAllUsers) {
    const start = performance.now();
    const spin = new Spinner({
        prefixText: "Retrieving git stats for current organization"
    }).start("");

    let ret;
    try {
        const token = await getToken();
        const repositories = await fetch(GITHUB_ORGA, { ...token, kind: "orgs" });
        ret = (await Promise.all(repositories.map(fetchPullRequests)))
            .sort((left, right) => right.issues - left.issues || right.pull_requests - left.pull_requests);

        const end = cyan().bold((performance.now() - start).toFixed(2));
        spin.succeed(`Successfully handled ${green().bold(ret.length)} repositories in ${end} millisecondes !`);
    }
    catch (error) {
        spin.failed(red().bold(error.message));

        return;
    }

    const mxLenRep = 30;
    const ul = white().bold().underline;
    console.log(
        `\n ${ul("Repository")}${" ".repeat(mxLenRep - 11)} ${ul("Issues")}${" ".repeat(mxLenRep - 11)} ${ul("Pull Request")}\n`
    );

    for (const { name, issues, pr } of ret) {
        const currPrLen = includeAllUsers ? pr.length : pr.filter((userName) => !FILTER_DISPLAY.has(userName)).length;
        if (issues === 0 && currPrLen === 0) {
            continue;
        }

        const rip = ripit(mxLenRep, name);
        console.log(`${green(name)} ${rip} ${yellow().bold(issues)} ${" ".repeat(23)} ${yellow().bold(currPrLen)}`);
        console.log(gray().bold(` ${"-".repeat(mxLenRep + 42)}`));
    }
}

/**
 * @async
 * @function fetchPullRequests
 * @description retrieve information and create an object
 * @returns {object}
 */
async function fetchPullRequests({ full_name, pulls_url, open_issues }) {
    const pull = pulls_url.slice(0, pulls_url.length - 9);

    const { data } = await http.get(pull, {
        headers: {
            "User-Agent": GITHUB_ORGA,
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3.raw"
        }
    });

    return { name: full_name, pr: data.map((row) => row.user.login), issues: open_issues };
}

module.exports = git;
