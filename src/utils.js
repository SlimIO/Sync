// Require Node.js dependencies
const { join } = require("path");
const fs = require("fs");
const { existsSync, promises: { access } } = require("fs");
const { spawn } = require("child_process");

// Require Third-Party dependencies
const git = require("isomorphic-git");
const Spinner = require("@slimio/async-cli-spinner");
const { cyan, red, green } = require("kleur");
const { get } = require("node-emoji");
const Lock = require("@slimio/lock");

// Constant
require("dotenv").config({ path: join(__dirname, "..", ".env") });
const asyncLocker = new Lock({ max: 3 });
const CWD = process.cwd();
const EXEC_SUFFIX = process.platform === "win32" ? ".cmd" : "";
git.plugins.set("fs", fs);

/**
 * @func envFileExist
 * @desc Check if .env exist and if there is a github token.
 * @returns {{}|{token:String}}
 */
function envFileExist() {
    const envExist = existsSync(join(__dirname, "..", ".env"));
    const envToken = process.env.GITHUB_TOKEN;

    return envExist && envToken !== undefined ? { token: envToken } : {};
}

/**
 * @async
 * @func cloneRepo
 * @desc Clone & pull master
 * @param {!string} repo Name of the repository
 * @param {!number} index Numero of the repository
 * @returns {string}
 */
async function cloneRepo(repo, index) {
    const repoName = `${repo.charAt(0).toUpperCase()}${repo.slice(1)}`;
    const dir = join(CWD, repoName);
    const url = `https://github.com/${process.env.ORGA}/${repoName}`;
    const spinner = new Spinner({ prefixText: cyan().bold(`${index + 1}. ${repoName}`), spinner: "dots" });
    const optsClone = Object.assign({
        dir, url,
        singleBranch: true,
        oauth2format: "github"
    }, envFileExist());
    const optsPull = Object.assign(optsClone, { ref: "master" });
    const free = await asyncLocker.lock();

    try {
        spinner.start();

        spinner.text = "Cloning from GitHub";
        await git.clone(optsClone);

        spinner.text = "Pull master from GitHub";
        await pull(repoName);

        // spinner.text = "Installing dependencies";
        // await npmInstall(dir);

        spinner.succeed();
        free();

        return null;
    }
    catch ({ message }) {
        spinner.failed();
        free();

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

async function log(name) {
    const { committer: { timestamp } } = (await git.log({
        gitdir: join(CWD, name, ".git"),
        depth: 1,
        ref: "master"
    }))[0];

    return timestamp;
}

async function pull(repoName) {
    const spinner = new Spinner({ prefixText: cyan().bold(repoName), spinner: "dots" });
    const dir = join(CWD, repoName);
    const url = `https://github.com/${process.env.ORGA}/${repoName}`;
    const optsPull = Object.assign({
        dir, url,
        singleBranch: true,
        ref: "master"
    }, envFileExist());

    spinner.start("Pull master from GitHub");
    const pullMaster = await git.pull(optsPull);
    spinner.succeed("OK");

    return pullMaster;
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

module.exports = { cloneRepo, envFileExist, log, pull };
