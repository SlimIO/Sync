"use strict";

// Require Node.js dependencies
const { join } = require("path");
const fs = require("fs");
const { access, rmdir } = require("fs").promises;
const { spawn } = require("child_process");
const { performance } = require("perf_hooks");

// Require Third-Party dependencies
const git = require("isomorphic-git");
const { cyan, white, green } = require("kleur");
const Lock = require("@slimio/lock");
const http = require("httpie");
const ms = require("ms");
const Spinner = require("@slimio/async-cli-spinner");

// CONSTANTS
const LOCKER_DEP_DL = new Lock({ maxConcurrent: 3 });
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const GITHUB_TOKEN = process.env.GIT_TOKEN;
const ORGA_URL = new URL(`https://github.com/${GITHUB_ORGA}/`);
const CWD = process.cwd();
const EXEC_SUFFIX = process.platform === "win32" ? ".cmd" : "";

Spinner.DEFAULT_SPINNER = "dots";
git.plugins.set("fs", fs);

/**
 * @async
 * @function getToken
 * @description Check if .env exist and if there is a github token.
 * @returns {{}|{token: string}}
 */
async function getToken() {
    try {
        await access(join(__dirname, "..", ".env"));

        return GITHUB_TOKEN ? { token: GITHUB_TOKEN, oauth2format: "github" } : {};
    }
    catch (error) {
        return {};
    }
}

/**
 * @async
 * @function cloneRepo
 * @description Clone & pull master
 * @param {!string} repoName Name of the repository
 * @param {object} [options] options
 * @param {boolean} [options.skipInstall=false] skip npm installation
 * @param {object} [options.token] token
 * @returns {Promise<string|null>}
 */
async function cloneRepo(repoName, options = {}) {
    const { skipInstall = false, token = {} } = options;

    const free = skipInstall ? () => void 0 : await LOCKER_DEP_DL.acquireOne();
    const dir = join(CWD, repoName);
    const spinner = new Spinner({
        prefixText: white().bold(repoName)
    }).start("Cloning from GitHub");

    try {
        const start = performance.now();

        // Clone
        await git.clone({
            dir,
            url: new URL(repoName, ORGA_URL).href,
            singleBranch: true,
            ...token
        });

        // Pull master branch
        spinner.text = "Pull master from GitHub";
        await pullMaster(repoName, { needSpin: false, token });

        if (!skipInstall) {
            spinner.text = "Installing dependencies";
            await npmInstall(repoName);
        }

        const executionTime = green().bold(`${((performance.now() - start) / 1000).toFixed(2)}s`);
        spinner.succeed(`Completed in ${executionTime}`);
    }
    catch (error) {
        console.log(error);
        spinner.failed(`Installation failed: ${error.message}`);
        await rmdir(dir, { recursive: true });
    }
    finally {
        free();
    }
}

/**
 * @async
 * @function fileExist
 * @description Verify if package-lock exist in the directory
 * @param {!string} dir Path of the file
 * @param {!string} fileName Name of the file
 * @returns {Promise<string>}
 */
async function fileExist(dir, fileName) {
    try {
        await access(join(dir, fileName));

        return true;
    }
    catch (error) {
        return false;
    }
}

/**
 * @async
 * @function logRepoLocAndRemote
 * @description Log local commits
 * @param {!string} repoName Name of the repository
 * @param {boolean?} logInfosRemoteOnly To return infos repository only
 * @returns {Promise<any>}
 */
async function logRepoLocAndRemote(repoName, logInfosRemoteOnly = false) {
    const commitOrNot = logInfosRemoteOnly ? "" : "/commits";

    try {
        const URL = `https://api.github.com/repos/${GITHUB_ORGA}/${repoName}${commitOrNot}`;
        const { data } = await http.get(URL, {
            headers: {
                "User-Agent": GITHUB_ORGA,
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3.raw"
            }
        });

        if (logInfosRemoteOnly) {
            return data;
        }

        const [firstCommitRemote] = data;
        const [firstCommitLocal] = await git.log({
            gitdir: join(CWD, repoName, ".git"),
            depth: 1,
            ref: "master"
        });
        const { sha, commit } = firstCommitRemote;
        const { oid, committer } = firstCommitLocal;

        // Equal commit, update OK
        if (sha === oid) {
            return false;
        }

        // Date local repo > date remote repo, update OK
        if (committer.timestamp > Date.parse(commit.committer.date) / 1000) {
            return false;
        }

        // No update
        return repoName;
    }
    catch (error) {
        return `${repoName} - Error ==> ${error.message}`;
    }
}

/**
 * @async
 * @function pullMaster
 * @description Pull from gitHub
 * @param {!string} repoName Name of the repository
 * @param {object} [options] options
 * @param {boolean} [options.needSpin=false] Need spinner or not
 * @param {boolean} [options.startNpmInstall=false] Need spinner or not
 * @param {object} [options.token] token
 * @param {Lock} [options.locker] locker
 * @returns {Promise<void>}
 */
async function pullMaster(repoName, options) {
    const { needSpin = false, startNpmInstall = false, token = {}, locker = null } = options;
    const start = performance.now();
    const free = locker === null ? () => void 0 : await locker.acquireOne();

    const spinner = new Spinner({
        verbose: needSpin,
        prefixText: cyan().bold(`${repoName}`)
    }).start("Pull master from GitHub");

    try {
        const dir = join(CWD, repoName);
        await git.pull({
            dir,
            singleBranch: true,
            ref: "master",
            ...token
        });

        if (startNpmInstall) {
            spinner.text = "Update dependencies";
            await npmInstall(repoName);
        }

        const time = green().bold(ms(performance.now() - start, { long: true }));
        spinner.succeed(`Completed in ${time}`);
    }
    catch (error) {
        spinner.failed(`Failed - ${error.message}`);
    }
    finally {
        free();
    }
}

/**
 * @async
 * @function npmInstall
 * @description Spawn a new node cmd
 * @param {!string} cwd Path of the directory
 * @param {!string} stdio spawn stdio
 * @returns {Promise<void>}
 */
async function npmInstall(cwd, stdio = "ignore") {
    const hasLock = await fileExist(cwd, "package-lock.json");
    const cmd = `npm${EXEC_SUFFIX ? ".cmd" : ""}`;

    await new Promise((resolve, reject) => {
        const subProcess = spawn(cmd, [hasLock ? "ci" : "install"], { cwd, stdio });
        subProcess.once("close", resolve);
        subProcess.once("error", reject);
    });
}

/**
 * @async
 * @function getSlimioToml
 * @description Verify if .toml exist in the folder
 * @param {!string} dir Folder checked
 * @returns {boolean}
 */
async function getSlimioToml(dir) {
    try {
        await access(join(CWD, dir, "slimio.toml"));

        return dir;
    }
    catch (error) {
        return false;
    }
}

/**
 * @typedef {object} infosRepo
 * @property {string} name Name of repository
 */
/**
 * @async
 * @function readTomlRemote
 * @description Request slimio.toml remote repos and search NAPI project
 * @param {infosRepo} remote Infos repository
 * @returns {Promise<string|boolean>}
 */
async function readTomlRemote({ name }) {
    try {
        const URL = `https://raw.githubusercontent.com/${GITHUB_ORGA}/${name}/master/slimio.toml`;
        const { data } = await http.get(URL, {
            headers: {
                "User-Agent": GITHUB_ORGA,
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3.raw"
            }
        });

        const dataMatching = /platform\s+=\s+"unix"/i.test(data);
        // eslint-disable-next-line
        if ((process.platform === "win32" && dataMatching) || (process.platform !== "win32" && !dataMatching)) {
            return name;
        }

        return false;
    }
    catch (error) {
        return false;
    }
}

/**
 * @function
 * @description Reapeat n times space string
 * @param {!number} nb Number 1
 * @param {!string|number} elem Number 2 for difference
 * @returns {string}
 */
function ripit(nb, elem) {
    const len = Number.isInteger(elem) ? elem.toString().length : elem.length;

    return " ".repeat(nb - len);
}

/**
 * @function wordMaxLength
 * @description Analyze a array and find the longest string
 * @param {string[]} arrayString Array to analyze
 * @returns {number}
 */
function wordMaxLength(arrayString = []) {
    return arrayString.sort((left, right) => left.length - right.length).pop().length;
}

module.exports = {
    cloneRepo,
    getToken,
    getSlimioToml,
    logRepoLocAndRemote,
    pullMaster,
    readTomlRemote,
    ripit,
    wordMaxLength
};
