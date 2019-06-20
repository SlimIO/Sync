# sync
![version](https://img.shields.io/badge/version-0.1.0-blue.svg)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/is/commit-activity)
![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)

SlimIO Synchronize. This tool has been created to help Developer and Integrator to work, download and verify each local SlimIO repository.

## Requirements
- Node.js v10 or higher
- Administrative privilege for some commands.

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @slimio/sync
# or
$ yarn add @slimio/sync
```

If you want to download private SlimIO repository, create a local .env file with the following content:

```
GITHUB_TOKEN=
GITHUB_ORGA=
NPM_TOKEN=
```

If you don't know how to get a personnal token, please follow [Github Guide](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) and [Npm Guide](https://docs.npmjs.com/creating-and-viewing-authentication-tokens).

## Usage example
```bash
$ slimio-sync install
# or
$ slimio-sync outdated
# or
$ slimio-sync psp
```

## API

<details>
<summary>install</summary>
<br/>

process:
- Clone the all repository of SlimIO
- Pull master branch for each repository
- Installs the dependencies for each repository

If some repository were already present locally, the `install` command checks for updates and pull master branch if necessary.  

If no SlimIO projects are present on your computer, installation may take a little while

</details>

<details>
<summary>outdated</summary>
<br/>

Checks for each folder (repository SlimIO) the versions dependencies (current / latest).

</details>

## License
MIT
