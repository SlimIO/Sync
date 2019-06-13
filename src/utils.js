// Require Node.js dependencies
const { join } = require("path");
const fs = require("fs");
const cp = require("child_process");

// Require Third-Party dependencies
const git = require("isomorphic-git");
const Spinner = require("@slimio/async-cli-spinner");
const { cyan, red, green } = require("kleur");
const { get } = require("node-emoji");

// Constant
const CWD = process.cwd();
const EXEC_SUFFIX = process.platform === "win32" ? ".cmd" : "";
git.plugins.set("fs", fs);

/**
 * @async
 * @func cloneRepo
 * @desc Clone & pull master
 * @param {!string} repo Name of the repository
 * @param {!string} token Token github
 * @returns {string}
 */
async function cloneRepo(repo, token) {
    const repoName = `${repo.charAt(0).toUpperCase()}${repo.slice(1)}`;
    const dir = join(CWD, `${repoName}_TEST`);
    const url = `https://github.com/SlimIO/${repoName}`;
    const spinner = new Spinner({ prefixText: cyan().bold(repoName), spinner: "dots" });
    const optsClone = Object.assign({
        dir, url,
        singleBranch: true,
        oauth2format: "github"
    }, token);
    const optsPull = Object.assign(optsClone, { ref: "master" });

    try {
        spinner.start();

        spinner.text = "Cloning from GitHub";
        await git.clone(optsClone);

        spinner.text = "Pull master from GitHub";
        await git.pull(optsPull);
        spinner.succeed("OK");

        return `${green(get(":heavy_check_mark:"))} ${repoName}`;
    }
    catch ({ message }) {
        spinner.failed();

        return `${red(get(":x:"))} ${repoName} - Error ==> ${message}`;
    }
}

module.exports = { cloneRepo };
