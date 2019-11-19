# Sync
![version](https://img.shields.io/badge/dynamic/json.svg?url=https://raw.githubusercontent.com/SlimIO/Sync/master/package.json?token=AOgWw3vrgQuu-U4fz1c7yYZyc7XJPNtrks5catjdwA%3D%3D&query=$.version&label=Version)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/Sync/commit-activity)
![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)
![dep](https://img.shields.io/david/SlimIO/Sync)
![size](https://img.shields.io/github/languages/code-size/SlimIO/Sync)
[![Known Vulnerabilities](https://snyk.io//test/github/SlimIO/Sync/badge.svg?targetFile=package.json)](https://snyk.io//test/github/SlimIO/Sync?targetFile=package.json)
[![Build Status](https://travis-ci.com/SlimIO/Sync.svg?branch=master)](https://travis-ci.com/SlimIO/Sync)
[![Greenkeeper badge](https://badges.greenkeeper.io/SlimIO/Sync.svg)](https://greenkeeper.io/)

SlimIO Synchronize. This tool has been created to help Developer and Integrator to work, download and verify each local SlimIO repositories.

> Note: This project can work with any github Organisation (only the psp command is dedicated to SlimIO).

<p align="center">
    <img src="https://i.imgur.com/pn8WNoW.gif">
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v12 or higher

## Getting Started

This package is not yet available on npm. Currently simple for our team to clone and run a link.

```bash
$ git clone https://github.com/SlimIO/Sync.git
$ cd Sync
$ npm ci
$ npm link
```

## Environment Variables

To configure the project you have to register (set) environment variables on your system. These variables can be set in a **.env** file (that file must be created at the root of the project).
```
GIT_TOKEN=
GITHUB_ORGA=
NPM_TOKEN=
TOML=true
```

To known how to get a **GIT_TOKEN** and **NPM_TOKEN** or how to register environment variables follow our [Governance Guide](https://github.com/SlimIO/Governance/blob/master/docs/tooling.md#environment-variables).

## Usage example
```bash
$ psync install
# or
$ psync outdated
# or
$ psync psp
```

To show help just type
```bash
$ psync --help
```

## Synchronizing all projects (or some given projects).

The **install** command has been build to install and sync all SlimIO projects automatically.

To pickup some given project (by their github name):
```bash
psync install --pick Scheduler,Addon,Core
```

If your need is only to clone repositories (which is faster) just add the `--noinstall` option.

## Windows users
Windows Defender must be a problem for the **install command**. The following script will prevent Windows Defender to scan Node.js or npm commands and binaries...

```powershell
Write-Host "Excluding appdata NPM folder and Node.JS install folder from Windows Defender."
Add-MpPreference -ExclusionPath ([System.Environment]::ExpandEnvironmentVariables("%APPDATA%\npm\"))
Add-MpPreference -ExclusionPath (Get-ItemProperty "HKLM:SOFTWARE\Node.js" | Select-Object -Property InstallPath)

Write-Host "Excluding node related executables from Windows Defender."
("node", "node.exe", "Expo XDE.exe", "yarn", "yarn.exe") | foreach {Add-MpPreference -ExclusionProcess $_}
```

> Note: powershell script extension is **ps1**.

## API
TBC

## Dependencies

|Name|Refactoring|Security Risk|Usage|
|---|---|---|---|
|[@slimio/async-cli-spinner](https://github.com/SlimIO/Async-cli-spinner)|Minor|Low|Elegant Asynchronous Terminal (CLI) Spinner|
|[@slimio/lazy](https://github.com/SlimIO/Lazy)|Minor|Low|Setup Lazy evaluation on JavaScript Objects|
|[@slimio/lock](https://github.com/SlimIO/Lock)|Minor|Low|Semaphore for async/await|
|[@slimio/pretty-json](https://github.com/SlimIO/Pretty-JSON)|Minor|Low|Stdout beautified JSON|
|[@slimio/psp](https://github.com/SlimIO/psp)|Minor|High|SlimIO projects structure policies|
|[cliui](https://github.com/yargs/cliui#readme)|Minor|High|Create complicated column design in the terminal|
|[dotenv](https://github.com/motdotla/dotenv)|Minor|Low|Loads environment variables from .env|
|[fast-outdated](https://github.com/fraxken/fast-outdated#readme)|Minor|High|Javascript implementation of `npm outdated` command|
|[fetch-github-repositories](https://github.com/fraxken/fetch-github-repositories)|Minor|Low|Fetch github repositories|
|[httpie](https://github.com/lukeed/httpie#readme)|Minor|Low|A Node.js HTTP client as easy as pie!|
|[isomorphic-git](https://isomorphic-git.org/)|Minor|High|Pure Javascript git implementation|
|[kleur](https://github.com/lukeed/kleur)|Minor|Low|The fastest Node.js library for formatting terminal text with ANSI colors|
|[lodash.pick](https://lodash.com/)|Minor|Low|Pick items in a given Object|
|[make-promises-safe](https://github.com/mcollina/make-promises-safe)|⚠️Major|Low|Force Node.js [DEP00018](https://nodejs.org/dist/latest-v8.x/docs/api/deprecations.html#deprecations_dep0018_unhandled_promise_rejections)|
|[ms](https://github.com/zeit/ms#readme)|Minor|Low|Convert various time formats to milliseconds.|
|[open](https://github.com/sindresorhus/open#readme)|Minor|High|Open stuff like URLs, files, executables. Cross-platform.|
|[qoa](https://github.com/klaussinani/qoa#readme)|Minor|Low|Minimal interactive command-line prompts|
|[sade](https://github.com/lukeed/sade#readme)|Minor|Low|Sade is a small but powerful tool for building command-line interface (CLI) applications for Node.js that are fast, responsive, and helpful!|
|[semver](https://github.com/npm/node-semver)|⚠️Major|Low|Semver parser/utilities for node|

## License
MIT
