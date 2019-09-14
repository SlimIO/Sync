/* eslint-disable arrow-body-style */
"use strict";

// Require Third-party Dependencies
const ui = require("cliui");
const { gray } = require("kleur");

class CLITable {
    static create(text, width = 20, align = "left") {
        return { text, width, align };
    }

    constructor(header, addSeperator = true) {
        if (!Array.isArray(header)) {
            throw new TypeError("header must be an array");
        }

        this.ui = ui();
        this.headers = header.map((text) => {
            return typeof text === "string" ? {
                text,
                width: 10,
                align: "center"
            } : text;
        });
        this.width = this.headers.reduce((prev, curr) => prev + curr.width, 0);
        this.ui.div(...this.headers);
        this.addSeperator = Boolean(addSeperator);
        this.rowCount = 0;
        if (this.addSeperator) {
            this.ui.div({
                text: gray().bold(` ${"-".repeat(this.width)}`),
                width: this.width
            });
        }

        console.log("");
    }

    add(rows) {
        if (!Array.isArray(rows)) {
            return;
        }
        this.rowCount++;

        this.ui.div(...rows.slice(0, this.headers.length).map((text, index) => {
            return typeof text === "string" ? {
                width: this.headers[index].width,
                align: this.headers[index].align,
                text
            } : text;
        }));

        if (this.addSeperator) {
            this.ui.div({
                text: gray().bold(` ${"-".repeat(this.width)}`),
                width: this.width
            });
        }
    }

    show() {
        if (this.rowCount > 0) {
            console.log(this.ui.toString());
        }
    }
}

module.exports = CLITable;
