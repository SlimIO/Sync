"use strict";

// Require Third-party dependencies
const { green, yellow, white, cyan, red } = require("kleur");
const { fetch } = require("fetch-github-repositories");
const http = require("httpie");
const Spinner = require("@slimio/async-cli-spinner");

// Require Internal Dependencies
const { getToken, loadLocalConfig } = require("../src/utils");
const CLITable = require("../src/cli-table.js");

// CONSTANTS
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
    const config = await loadLocalConfig();
    const spin = new Spinner({
        prefixText: "Retrieving git stats for current organization"
    }).start("");

    let ret;
    try {
        const token = config.github_token || await getToken();
        const repositories = await fetch(config.github_orga, { ...token, kind: "orgs" });
        ret = await Promise.all(repositories.map((value) => fetchPullRequests(value, { token, org: config.github_orga })));
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
        const currPrLen = includeAllUsers ?
            pr.length :
            pr.filter((userName) => !config.git_issues_filters.has(userName)).length;
        const currIssueLen = includeAllUsers ?
            issues.length :
            issues.filter((userName) => !config.git_issues_filters.has(userName)).length;

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
 * @param {object} fetchPullRequests
 * @param {object} config
 * @returns {Promise<repository>}
 */
async function fetchPullRequests({ full_name, pulls_url, open_issues, issues_url }, config) {
    // https://api.github.com/repos/SlimIO/Config/[pulls || issues]{/number} (example of pulls_url)
    //                                                             ▲ here we slice this from the URL.
    const pull = pulls_url.slice(0, pulls_url.length - PULL_URL_POSTFIX_LEN);
    const issue = issues_url.slice(0, issues_url.length - PULL_URL_POSTFIX_LEN);

    const headers = {
        "User-Agent": config.org,
        Authorization: `token ${config.token}`,
        Accept: "application/vnd.github.v3.raw"
    };

    const { data: pulls } = await http.get(pull, { headers });
    const { data: issues } = await http.get(issue, { headers });

    return { name: full_name, pr: pulls.map((row) => row.user.login), issues: issues.map((row) => row.user.login) };
}

module.exports = git;
