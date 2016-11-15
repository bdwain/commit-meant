#! /usr/bin/env node

/* globals require, process */

'use strict';

const log = {},
    _ = require('lodash'),
    exec = require('child_process').exec,
    program = require('commander'),
    NO_COMMIT_MEANT = 'No commit-meant found.',
    messageRe = /^(MAJOR|MINOR|PATCH)/,
    noteRe = /[\*+-]\s/g,
    LOG_SEPARATOR = 'GJVX47gWz4@7m&*uYX%5qe24';

function getChangeType(msg) {
    if(!messageRe.test(msg)){
      return null;
    }
    return msg.substr(0, 5).toLowerCase();
}

program
    .version('0.1.0')
    .usage('[options] [source]')
    .description('Reads GIT history and determines the meaning of merging the specified source commit, or HEAD by default, into the destination branch (origin/master by default).')
    .option('-d, --destination <destination>', 'the destination branch for merges, "origin/master" by default')
    .option('-s, --silent', 'skips outputting to the console')
    .option('-l, --log', 'if a commit-meant is not found, output a message with debug information')
    .parse(process.argv);

function output(cm, dontExit) {
    if (!program.silent) {
        if (!cm) {
            if (program.log) {
                console.log(log);
            }
            console.log(NO_COMMIT_MEANT);
        }
        else {
            console.log(cm);
        }
    }

    if (!dontExit) {
        process.exit(cm ? 0 : 1);
    }
}

let destination = program.destination || 'origin/master',
    source = program.args.length === 0 ? 'HEAD' : program.args[0],
    logCommand = `git log ${destination}..${source} --no-merges --pretty=format:'${LOG_SEPARATOR}%s%n%n%b'`;

log.logCommand = logCommand;

exec(logCommand, (error, stdout, stderr) => {
    if (error || stderr.toString().length > 0) {
        output(null);
        return;
    }

    if (stdout.length === 0) {
        // SOURCE === DESTINATION case: look at the destination tip for cm
        let tipLogCommand = `git log ${destination} -1 --no-merges --pretty=format:'%s%n%n%b'`;

        log.tipLogCommand = tipLogCommand;

        exec(tipLogCommand, (error, stdout) => {
            if (error || stderr.toString().length > 0) {
                output(null);
                return;
            }

            let tipLogOutput = stdout.toString(),
                cm = getChangeType(tipLogOutput);

            output(cm);
        });
    } else {
        let logOutput = stdout.toString(),
            cms = _.map(_.drop(logOutput.split(LOG_SEPARATOR)), getChangeType);

        log.logOutput = logOutput;
        log.cms = cms;

        output(_.find(cms, cm => cm));
    }
});
