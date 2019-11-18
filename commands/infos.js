"use strict";

// Require Node.js Dependencies
const { basename } = require("path");

// Require Internals Dependencies
const { logRepoLocAndRemote } = require("../src/utils");

// Constants
const CWD = process.cwd();

/**
 * @async
 * @function getInfos
 * @description Get infos about repository
 * @param {sring[]} opts Options
 * @returns {void}
 */
async function getInfos(opts = []) {
    const filteredInfos = {};
    const infos = await logRepoLocAndRemote(basename(CWD), true);

    for (const field of opts) {
        if (!Reflect.has(infos, field)) {
            continue;
        }

        filteredInfos[field] = infos[field];
    }

    console.log(opts.length > 0 ? filteredInfos : infos);
}

module.exports = getInfos;
