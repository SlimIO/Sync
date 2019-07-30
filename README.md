# Sync
![version](https://img.shields.io/badge/dynamic/json.svg?url=https://raw.githubusercontent.com/SlimIO/Sync/master/package.json?token=AOgWw3vrgQuu-U4fz1c7yYZyc7XJPNtrks5catjdwA%3D%3D&query=$.version&label=Version)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/SlimIO/Sync/commit-activity)
![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)
![dep](https://img.shields.io/david/SlimIO/Sync)
![size](https://img.shields.io/github/languages/code-size/SlimIO/Sync)
[![Known Vulnerabilities](https://snyk.io//test/github/SlimIO/Sync/badge.svg?targetFile=package.json)](https://snyk.io//test/github/SlimIO/Sync?targetFile=package.json)

SlimIO Synchronize. This tool has been created to help Developer and Integrator to work, download and verify each local SlimIO repositories.

> Note: This project can work with any github Organisation (only the psp command is dedicated to SlimIO).

<p align="center">
    <img src="https://i.imgur.com/pn8WNoW.gif">
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v10 or higher

## Getting Started

This package is not yet available on npm. Currently simple for our team to clone and run a link.

```bash
$ git clone https://github.com/SlimIO/Sync.git
$ cd Sync
$ npm ci
$ npm link
```

If you want to download private SlimIO repository, create a local .env file at the root with the following vars:

```
GITHUB_TOKEN=
GITHUB_ORGA=
NPM_TOKEN=
TOML=true
```

If you don't know how to get a personnal token, please follow [Github Guide](https://help.github.com/en/articles/creating-a-personal-access-token-for-the-command-line) and [Npm Guide](https://docs.npmjs.com/creating-and-viewing-authentication-tokens).

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
|[@slimio/async-cli-spinner](https://github.com/SlimIO/Async-cli-spinner)|Minor|Low|Multi async cli spinner|
|[@slimio/lazy](https://github.com/SlimIO/Lazy)|Minor|Low|Setup lazy props on Objects|
|[@slimio/lock](https://github.com/SlimIO/Lock#readme)|Minor|High|TBC|
|[@slimio/psp](https://github.com/SlimIO/psp#readme)|Minor|High|TBC|
|[dotenv](https://github.com/motdotla/dotenv)|Minor|Low|Env file|
|[fast-outdated](https://github.com/fraxken/fast-outdated#readme)|⚠️Major|High|TBC|
|[httpie](https://github.com/jakubroztocil/httpie)|Minor|Low|	HTTP request|
|[isomorphic-git](https://isomorphic-git.org/)|⚠️Major|High|TBC|
|[kleur](https://github.com/lukeed/kleur)|Minor|Low|TTY color|
|[make-promises-safe](https://github.com/mcollina/make-promises-safe#readme)|⚠️Major|Low|TBC|
|[qoa](https://github.com/klaussinani/qoa#readme)|⚠️Major|Low|TBC|
|[repos](https://github.com/jonschlinkert/repos)|⚠️Major|Low|Get all GIT repositories|
|[sade](https://github.com/lukeed/sade#readme)|⚠️Major|High|TBC|
|[semver](https://github.com/npm/node-semver)|⚠️Major|Low|SemVer validation|
|[premove](https://github.com/lukeed/premove#readme)|Minor|Low|Remove dir/files recursively|

## License
MIT
