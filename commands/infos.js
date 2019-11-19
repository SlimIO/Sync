"use strict";

// Require Node.js Dependencies
const { basename } = require("path");

// Require Internals Dependencies
const { logRepoLocAndRemote } = require("../src/utils");

// Require Third-Party Dependencies
const prettyJSON = require("@slimio/pretty-json");

// Constants
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
 * @param {sring[]} opts Options
 * @returns {void}
 */
async function getInfos() {
    const filteredInfos = {};
    const infos = await logRepoLocAndRemote(basename(CWD), true);

    for (const field of FIELDS_TO_DISPLAY) {
        if (!Reflect.has(infos, field)) {
            continue;
        }

        filteredInfos[field] = infos[field];
    }

    console.log(prettyJSON(filteredInfos));
}

module.exports = getInfos;
