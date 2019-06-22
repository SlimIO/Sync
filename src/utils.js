// Require Node.js dependencies
const { join } = require("path");
const fs = require("fs");
const { access } = require("fs").promises;
const { spawn } = require("child_process");
const { performance } = require("perf_hooks");

// Require Third-Party dependencies
const git = require("isomorphic-git");
const { cyan, red, white, green } = require("kleur");
const { get } = require("node-emoji");
const Lock = require("@slimio/lock");
const http = require("httpie");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Constant
require("dotenv").config({ path: join(__dirname, "..", ".env") });
const LOCKER_DEP_DL = new Lock({ max: 3 });
const LOCKER_PULL_MASTER = new Lock({ max: 8 });
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const _URL = `https://github.com/${GITHUB_ORGA}/`;
const CWD = process.cwd();
const EXEC_SUFFIX = process.platform === "win32" ? ".cmd" : "";
git.plugins.set("fs", fs);

/**
 * @async
 * @func getToken
 * @desc Check if .env exist and if there is a github token.
 * @returns {{}|{token:String}}
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
 * @func cloneRepo
 * @desc Clone & pull master
 * @param {!string} repo Name of the repository
 * @param {number} index Numero of the repository
 * @returns {Promise<string|null>}
 */
async function cloneRepo(repo, index) {
    const repoName = `${repo.charAt(0).toUpperCase()}${repo.slice(1)}`;
    const dir = join(CWD, repoName);
    const url = `${_URL}${repoName}`;
    const optsClone = Object.assign({
        dir, url,
        singleBranch: true
    }, await getToken());
    const free = await LOCKER_DEP_DL.lock();
    const spinner = new Spinner({
        prefixText: white().bold(repoName)
    });

    try {
        const start = performance.now();
        spinner.start();
        spinner.text = "Cloning from GitHub";
        await git.clone(optsClone);

        spinner.text = "Pull master from GitHub";
        await pullMaster(repoName);

        // spinner.text = "Installing dependencies";
        // await npmInstall(dir);

        const time = green().bold(`${(performance.now() - start).toFixed(2)}`);
        spinner.succeed(`Fetched and installed in ${time} milliseconds.`);
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
 * @func fileExist
 * @desc Verify if package-lock exist in the directory
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
 * @func logRepoLocAndRemote
 * @desc Log local commits
 * @param {!String} repoName Name of the repository
 * @returns {Promise<string|Boolean>}
 */
async function logRepoLocAndRemote(repoName) {
    try {
        const URL = `https://api.github.com/repos/${GITHUB_ORGA}/${repoName}/commits`;
        const { data: [firstCommitRemote] } = await http.get(URL, {
            headers: {
                "User-Agent": GITHUB_ORGA,
                Authorization: GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : "",
                Accept: "application/vnd.github.v3.raw"
            }
        });
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
 * @func pullMaster
 * @desc Pull from gitHub
 * @param {!String} repoName Name of the repository
 * @param {Boolean} needSpin Need spinner or not
 * @returns {Promise<void>}
 */
async function pullMaster(repoName, needSpin = false) {
    let spinner;
    const free = await LOCKER_PULL_MASTER.lock();
    const dir = join(CWD, repoName);
    const url = `${_URL}${repoName}`;
    const optsPull = Object.assign({
        dir, url,
        singleBranch: true,
        ref: "master"
    }, await getToken());

    if (needSpin) {
        spinner = new Spinner({
            prefixText: cyan().bold(`${repoName}`)
        }).start("Pull master from GitHub");
    }

    try {
        await git.pull(optsPull);
        if (needSpin) {
            spinner.succeed("Pull master OK");
        }
        free();
    }
    catch (error) {
        if (needSpin) {
            spinner.failed(`Failed - ${error.message}`);
        }
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
    const cmd = await fileExist(dir, "package-lock.json") ? "ci" : "install";

    await new Promise((resolve, reject) => {
        const subProcess = spawn(`npm${EXEC_SUFFIX ? ".cmd" : ""}`, [cmd], { cwd: dir, stdio: "pipe" });
        subProcess.once("close", resolve);
        subProcess.once("error", reject);
    });
}

/**
 * @async
 * @func getSlimioToml
 * @desc Verify if .toml exist in the folder
 * @param {!String} dir Folder checked
 * @returns {Boolean}
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
 * @typedef {Object} infosRepo
 * @property {string} name Name of repository
 */
/**
 * @async
 * @func readTomlRemote
 * @desc Request slimio.toml remote repos and search NAPI project
 * @param {infosRepo} remote Infos repository
 * @returns {Promise<string|boolean>}
 */
async function readTomlRemote(remote) {
    const { name } = remote;
    const regEx = /unix/i;
    const platform = process.platform;
    const URL = `https://raw.githubusercontent.com/${GITHUB_ORGA}/${name}/master/slimio.toml`;

    try {
        const { data } = await http.get(URL, {
            headers: {
                "User-Agent": GITHUB_ORGA,
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3.raw"
            }
        });

        if (platform === "win32" && regEx.test(data)) {
            return name;
        }

        if (platform !== "win32" && !regEx.test(data)) {
            return name;
        }
    }
    catch (error) {
        return false;
    }

    return false;
}

/**
 * @func
 * @desc Reapeat n times space string
 * @param {!number} nb Number 1
 * @param {!string|number} elem Number 2 for difference
 * @returns {string}
 */
function ripit(nb, elem) {
    const len = Number.isInteger(elem) ? elem.toString().length : elem.length;

    return " ".repeat(nb - len);
}

/**
 * @func wordMaxLength
 * @desc Analyze a array and find the longest string
 * @param {string[]} arrayString Array to analyze
 * @return {number}
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
