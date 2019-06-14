// Require Node.js dependencies
const { join } = require("path");
const fs = require("fs");
const { access } = require("fs").promises;
const { spawn } = require("child_process");

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
 * @param {!number} index Numero of the repository
 * @param {!string} token Token github
 * @returns {string}
 */
async function cloneRepo(repo, index, token) {
    const repoName = `${repo.charAt(0).toUpperCase()}${repo.slice(1)}`;
    const dir = join(CWD, `${repoName}_TEST`);
    const url = `https://github.com/SlimIO/${repoName}`;
    const spinner = new Spinner({ prefixText: cyan().bold(`${index + 1}. ${repoName}`), spinner: "dots" });
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

        // spinner.text = "Installing dependencies";
        // await npmInstall(dir);

        spinner.succeed();
    }
    catch ({ message }) {
        spinner.failed();

        return `${red(get(":x:"))} ${repoName} - Error ==> ${message}`;
    }
}

/**
 * @async
 * @func pkgLockExist
 * @desc Verify if package-lock exist in the directory
 * @returns {string}
 */
async function pkgLockExist() {
    try {
        await access(join(dir, "package-lock.json"));

        return "ci";
    }
    catch (error) {
        return "install";
    }
}

/**
 * @async
 * @func npmInstall
 * @desc Spawn a new node cmd
 * @param {!string} dir Path of the directory
 * @returns {void}
 */
async function npmInstall(dir) {
    const cmd = await pkgLockExist();

    await new Promise((resolve, reject) => {
        const subProcess = spawn(`npm${EXEC_SUFFIX ? ".cmd" : ""}`, [cmd], { cwd: dir, stdio: "pipe" });
        subProcess.once("close", resolve);
        subProcess.once("error", reject);
    });
}

module.exports = { cloneRepo };
