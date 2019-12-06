"use strict";

// Require Third-party dependencies
const { green, yellow, white, cyan, red } = require("kleur");
const { fetch } = require("fetch-github-repositories");
const http = require("httpie");
const Spinner = require("@slimio/async-cli-spinner");

// Require Internal Dependencies
const { getToken } = require("../src/utils");
const CLITable = require("../src/cli-table.js");

// CONSTANTS
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const GITHUB_TOKEN = process.env.GIT_TOKEN;
const FILTER_DISPLAY = new Set(["greenkeeper[bot]", "snyk-bot"]);
const PULL_URL_POSTFIX_LEN = "{/number}".length;

// Vars
Spinner.DEFAULT_SPINNER = "dots";
const ul = white().bold().underline;

/**
 * @async
 * @function git
 * @description retrieve git stats
 * @param {!boolean} includeAllUsers include all github users
 * @returns {Promise<void>}
 */
async function git(includeAllUsers) {
    const spin = new Spinner({
        prefixText: "Retrieving git stats for current organization"
    }).start("");

    let ret;
    try {
        const token = await getToken();
        const repositories = await fetch(GITHUB_ORGA, { ...token, kind: "orgs" });
        ret = await Promise.all(repositories.map(fetchPullRequests));
        ret.sort((left, right) => right.issues.length - left.issues.length);

        const end = cyan().bold(spin.elapsedTime.toFixed(2));
        spin.succeed(`Successfully handled ${green().bold(ret.length)} repositories in ${end} millisecondes !`);
    }
    catch (error) {
        spin.failed(red().bold(error.message));

        return;
    }

    const table = new CLITable([
        CLITable.create(ul("Repository"), 30),
        ul("Issues"),
        CLITable.create(ul("Pull Request"), 14, "center")
    ]);
    for (const { name, issues, pr } of ret) {
        const currPrLen = includeAllUsers ? pr.length : pr.filter((userName) => !FILTER_DISPLAY.has(userName)).length;
        const currIssueLen = includeAllUsers ? issues.length : issues.filter((userName) => !FILTER_DISPLAY.has(userName)).length;

        if (currIssueLen === 0 && currPrLen === 0) {
            continue;
        }
        table.add([green(name), yellow().bold(currIssueLen), yellow().bold(currPrLen)]);
    }

    table.show();
    if (table.rowCount === 0) {
        console.log(yellow().bold(" ⚠️ Nothing was found you may use --all or -a option"));
    }
}

/**
 * @typedef {object} repository
 * @property {string} name
 * @property {Array<string>} pr
 * @property {number} issues
 */

/**
 * @async
 * @function fetchPullRequests
 * @description fetch repository pull-requests on github
 * @returns {Promise<repository>}
 */
async function fetchPullRequests({ full_name, pulls_url, open_issues, issues_url }) {
    // https://api.github.com/repos/SlimIO/Config/[pulls || issues]{/number} (example of pulls_url)
    //                                                             ▲ here we slice this from the URL.
    const pull = pulls_url.slice(0, pulls_url.length - PULL_URL_POSTFIX_LEN);
    const issue = issues_url.slice(0, issues_url.length - PULL_URL_POSTFIX_LEN);

    const headers = {
        "User-Agent": GITHUB_ORGA,
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3.raw"
    };

    const { data: pulls } = await http.get(pull, { headers });
    const { data: issues } = await http.get(issue, { headers });

    return { name: full_name, pr: pulls.map((row) => row.user.login), issues: issues.map((row) => row.user.login) };
}

module.exports = git;
