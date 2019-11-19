"use strict";

// Require Node.js Dependencies
const { basename } = require("path");

// Require Third-Party Dependencies
const prettyJSON = require("@slimio/pretty-json");
const pick = require("lodash.pick");
const open = require("open");

// Require Internals Dependencies
const { logRepoLocAndRemote } = require("../src/utils");

// CONSTANTS
const CWD = process.cwd();
const FIELDS_TO_DISPLAY = [
    "name",
    "private",
    "html_url",
    "fork",
    "description",
    "open_issues"
];

/**
 * @async
 * @function getInfos
 * @description Get infos about repository
 * @param {!boolean} openGithubPage
 * @returns {Promise<void>}
 */
async function getInfos(openGithubPage) {
    const infos = await logRepoLocAndRemote(basename(CWD), true);

    if (openGithubPage) {
        await open(infos.html_url);
    }
    prettyJSON(pick(infos, FIELDS_TO_DISPLAY));
}

module.exports = getInfos;
