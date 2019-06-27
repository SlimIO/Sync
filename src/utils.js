// Require Node.js dependencies
const { join } = require("path");
const fs = require("fs");
const { access } = require("fs").promises;
const { spawn } = require("child_process");
const { performance } = require("perf_hooks");

// Require Third-Party dependencies
const git = require("isomorphic-git");
const { cyan, white, green } = require("kleur");
const premove = require("premove");
const Lock = require("@slimio/lock");
const http = require("httpie");
const Spinner = require("@slimio/async-cli-spinner");
Spinner.DEFAULT_SPINNER = "dots";

// Constant
require("dotenv").config({ path: join(__dirname, "..", ".env") });
const LOCKER_DEP_DL = new Lock({ max: 3 });
const GITHUB_ORGA = process.env.GITHUB_ORGA;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ORGA_URL = new URL(`https://github.com/${GITHUB_ORGA}/`);
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
 * @param {!string} repoName Name of the repository
 * @param {Object} [options] options
 * @param {Boolean} [options.skipInstall=false] skip npm installation
 * @param {Boolean} [options.dev] token
 * @param {Object} [options.token] token
 * @param {number} [options.space] token
 * @returns {Promise<string|null>}
 */
async function cloneRepo(repoName, options = {}) {
    const { skipInstall = false, token = {}, dev, space = 20 } = options;

    const free = await LOCKER_DEP_DL.lock();
    const pretty = ".".repeat(space - repoName.length);
    const dir = join(CWD, repoName);
    const spinner = new Spinner({
        prefixText: white().bold(repoName)
    }).start(`${pretty}Cloning from GitHub`);

    try {
        const start = performance.now();

        // Clone
        cmdOptions: {
            await git.clone({
                dir,
                url: new URL(repoName, ORGA_URL).href,
                singleBranch: true,
                ...token
            });
            if (dev) {
                break cmdOptions;
            }

            // Pull master branch
            spinner.text = `${pretty}Pull master from GitHub`;
            await pullMaster(repoName, { needSpin: false, token });

            if (!skipInstall) {
                spinner.text = `${pretty}Installing dependencies`;
                await npmInstall(repoName);
            }
        }

        const executionTime = green().bold(`${((performance.now() - start) / 1000).toFixed(2)}s`);
        spinner.succeed(`${pretty}Completed in ${executionTime}`);
    }
    catch (error) {
        spinner.failed(`${pretty}Installation failed: ${error.message}`);
        await premove(dir);
    }
    finally {
        free();
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
 * @param {Object} [options] options
 * @param {Boolean} [options.needSpin=false] Need spinner or not
 * @param {Boolean} [options.startNpmInstall=false] Need spinner or not
 * @param {Object} [options.token] token
 * @returns {Promise<void>}
 */
async function pullMaster(repoName, options) {
    const { needSpin = false, startNpmInstall = false, token = {} } = options;
    const start = performance.now();

    let spinner;
    const lockerPullMaster = new Lock({ max: startNpmInstall ? 3 : 8 });
    const free = await lockerPullMaster.lock();
    if (needSpin) {
        spinner = new Spinner({
            prefixText: cyan().bold(`${repoName}`)
        }).start("Pull master from GitHub");
    }

    try {
        await git.pull({
            dir: join(CWD, repoName),
            url: new URL(repoName, ORGA_URL).href,
            singleBranch: true,
            ref: "master",
            ...token
        });

        if (startNpmInstall) {
            spinner.text = "Installing dependencies";
            await npmInstall(repoName);
        }
        if (needSpin) {
            const end = cyan().bold((performance.now() - start).toFixed(2));
            const ifNpmI = startNpmInstall ? ` and installing dependencies in ${end} millisecondes !` : "";
            spinner.succeed(`Successfully handled pull master${ifNpmI}`);
        }
    }
    catch (error) {
        if (needSpin) {
            spinner.failed(`Failed - ${error.message}`);
        }
    }
    finally {
        free();
    }
}

/**
 * @async
 * @func npmInstall
 * @desc Spawn a new node cmd
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
