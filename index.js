#! /usr/bin/env node

/* globals require, process */

'use strict';

const
    _ = require('lodash'),
    exec = require('child_process').exec,
    program = require('commander'),
    NO_COMMIT_MEANT = 'No commit-meant found.',
    messageRe = /^(MAJOR|MINOR|PATCH) - ([A-Z].+)\n\n((?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?)\n\n((?:[^\*+-].+(?:\n\n)*)*)((?:[\*]\s.+\n*)*)/g,
    noteRe = /[\*+-]\s/g,
    LOG_SEPARATOR = 'GJVX47gWz4@7m&*uYX%5qe24';

function message2cm(msg) {
    let json = msg
        .replace(messageRe, '{ "changeType": "$1", "title": "$2", "issue": "$3", "description": "$4", "notes": "$5" }')
        .replace(/\n/g, ''),
        cm;

    try {
        cm = JSON.parse(json);
        cm.changeType = cm.changeType.toLowerCase();
        cm.notes = _.filter(_.map(cm.notes.trim().split(noteRe), note => note.trim()), note => note);

        return cm;
    } catch (e) {
        return null;
    }
}

program
    .version('0.1.0')
    .usage('[options] [branchName]')
    .option('-t, --tip', 'only check the tip of the branch for a commit-meant')
    .option('-f, --field <name>', 'output the value of the commit-meant field with the specified name')
    .parse(process.argv);

function output(cm, dontExit) {
    if (!cm) {
        console.log(NO_COMMIT_MEANT);
    } else if (program.field) {
        console.log(cm[program.field]);
    } else {
        console.log(cm);
    }

    if (!dontExit) {
        process.exit(cm ? 0 : 1);
    }
}

exec(`git log master..HEAD  --pretty=format:\'${LOG_SEPARATOR}%B\'`, (error, stdout) => {
    let cms = _.map(_.drop(stdout.split(LOG_SEPARATOR)), message2cm);

    if (program.tip) {
        output(cms.length === 0 ? null : cms[0]);
    } else {
        output(_.find(cms, cm => cm));
    }
});
