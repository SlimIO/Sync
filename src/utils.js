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
const lockerDep = new Lock({ max: 3 });
const lockerPull = new Lock({ max: 8 });
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const _URL = `https://github.com/${GITHUB_ORGA}/`;
const CWD = process.cwd();
const EXEC_SUFFIX = process.platform === "win32" ? ".cmd" : "";
git.plugins.set("fs", fs);

/**
 * @func getToken
 * @desc Check if .env exist and if there is a github token.
 * @returns {{}|{token:String}}
 */
function getToken() {
    const envExist = existsSync(join(__dirname, "..", ".env"));

    return envExist && GITHUB_TOKEN !== undefined ? { token: GITHUB_TOKEN } : {};
}

/**
 * @async
 * @func cloneRepo
 * @desc Clone & pull master
 * @param {!string} repo Name of the repository
 * @param {!number} index Numero of the repository
 * @returns {Promise<string|null>}
 */
async function cloneRepo(repo, index) {
    const repoName = `${repo.charAt(0).toUpperCase()}${repo.slice(1)}`;
    const dir = join(CWD, repoName);
    const url = `${_URL}${repoName}`;
    const spinner = new Spinner({
        prefixText: cyan().bold(`${index + 1}. ${repoName}`),
        spinner: "dots"
    });
    const optsClone = Object.assign({
        dir, url,
        singleBranch: true,
        oauth2format: "github"
    }, getToken());
    const optsPull = Object.assign(optsClone, { ref: "master" });
    const free = await lockerDep.lock();

    try {
        spinner.start();

        spinner.text = "Cloning from GitHub";
        await git.clone(optsClone);

        spinner.text = "Pull master from GitHub";
        await pull(repoName);

        // spinner.text = "Installing dependencies";
        // await npmInstall(dir);

        spinner.succeed("Ok");
        free();

        return null;
    }
    catch ({ message }) {
        spinner.failed("Failed");
        free();

        return `${red(get(":x:"))} ${repoName} - Error ==> ${message}`;
    }
}

/**
 * @async
 * @func pkgLockExist
 * @desc Verify if package-lock exist in the directory
 * @returns {Promise<string>}
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
 * @func log
 * @desc Log local commits
 * @param {!String} name Name of the repository
 * @returns {Promise<number>}
 */
async function log(name) {
    const [firstCommit] = await git.log({
        gitdir: join(CWD, name, ".git"),
        depth: 1,
        ref: "master"
    });

    return firstCommit.committer.timestamp;
}

/**
 * @async
 * @func pull
 * @desc Pull from gitHub
 * @param {!String} repoName Name of the repository
 * @param {Boolean} needSpin Need spinner or not
 * @returns {Promise<void>}
 */
async function pull(repoName, needSpin = false) {
    let spinner;
    const free = await lockerPull.lock();
    const dir = join(CWD, repoName);
    const url = `${_URL}${repoName}`;
    const optsPull = Object.assign({
        dir, url,
        singleBranch: true,
        ref: "master"
    }, getToken());

    if (needSpin) {
        spinner = new Spinner({
            prefixText: cyan().bold(`${repoName}`),
            spinner: "dots"
        });
        spinner.start("Pull master from GitHub");
    }

    try {
        await git.pull(optsPull);
        if (needSpin) spinner.succeed("OK");
        free();
    }
    catch (error) {
        if (needSpin) spinner.failed(`Failed - ${error.message}`);
        free();
    }
}

/**
 * @async
 * @func npmInstall
 * @desc Spawn a new node cmd
 * @param {!string} dir Path of the directory
 * @returns {Promise<void>}
 */
async function npmInstall(dir) {
    const cmd = await pkgLockExist();

    await new Promise((resolve, reject) => {
        const subProcess = spawn(`npm${EXEC_SUFFIX ? ".cmd" : ""}`, [cmd], { cwd: dir, stdio: "pipe" });
        subProcess.once("close", resolve);
        subProcess.once("error", reject);
    });
}

module.exports = { cloneRepo, getToken, log, pull };
