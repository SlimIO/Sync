// Require Node.js dependencies
const { join } = require("path");
const fs = require("fs");
const { existsSync, promises: { access } } = require("fs");
const { spawn } = require("child_process");

// Require Third-Party dependencies
const git = require("isomorphic-git");
const Spinner = require("@slimio/async-cli-spinner");
const { cyan, red } = require("kleur");
const { get } = require("node-emoji");
const Lock = require("@slimio/lock");
const http = require("httpie");

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
 * @param {number} index Numero of the repository
 * @returns {Promise<string|null>}
 */
async function cloneRepo(repo, index) {
    const repoName = `${repo.charAt(0).toUpperCase()}${repo.slice(1)}`;
    const dir = join(CWD, repoName);
    const url = `${_URL}${repoName}`;

    const optsClone = Object.assign({
        dir, url,
        singleBranch: true,
        oauth2format: "github"
    }, getToken());
    const free = await lockerDep.lock();

    try {
        const spinner = new Spinner({
            prefixText: cyan().bold(`${index + 1}. ${repoName}`),
            spinner: "dots"
        });
        spinner.start();
        spinner.text = "Cloning from GitHub";
        await git.clone(optsClone);

        spinner.text = "Pull master from GitHub";
        await pullMaster(repoName);

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
 * @returns {Promise<number>}
 */
async function logRepoLocAndRemote(repoName) {
    try {
        const URL = `https://api.github.com/repos/${GITHUB_ORGA}/${repoName}/commits`;
        const { data: [firstCommitRemote] } = await http.get(URL, {
            headers: {
                "User-Agent": GITHUB_ORGA,
                Authorization: `token ${GITHUB_TOKEN}`,
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
    const regEx = RegExp("napi", "i");
    const URL = `https://raw.githubusercontent.com/${GITHUB_ORGA}/${name}/master/slimio.toml`;

    try {
        const { data } = await http.get(URL, {
            headers: {
                "User-Agent": GITHUB_ORGA,
                Authorization: `token ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3.raw"
            }
        });

        if (regEx.test(data)) {
            return name;
        }
    }
    catch (error) {
        return false;
    }

    return false;
}

module.exports = { cloneRepo, getToken, logRepoLocAndRemote, pullMaster, readTomlRemote };
