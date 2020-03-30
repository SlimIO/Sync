"use strict";

// Require Third-party Dependencies
const levenshtein = require("fast-levenshtein");

class RemoteRepositories {
    constructor(repositories = []) {
        this.repos = new Set(repositories.map((repo) => repo.toLowerCase()));
    }

    get size() {
        return this.repos.size;
    }

    matchingName(repoName) {
        const localName = repoName.toLowerCase();

        if (this.repos.has(localName)) {
            return localName;
        }

        for (const repo of this.repos) {
            const count = levenshtein.get(repo, localName);
            if (count <= 2) {
                return repo;
            }
        }

        return null;
    }

    has(repoName) {
        if (typeof repoName !== "string") {
            throw new TypeError("repoName must be a string");
        }
        const localName = repoName.toLowerCase();

        return this.repos.has(localName) ? true : this.matchingName(localName) !== null;
    }
}

module.exports = RemoteRepositories;
