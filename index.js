#! /usr/bin/env node

/* globals require, process */

'use strict';

let _ = require('lodash'),
    path = require('path'),
    Git = require('nodegit'),
    program = require('commander');


const NO_COMMIT_MEANT = 'No commit-meant found.',
    messageRe = /^(MAJOR|MINOR|PATCH) - (.+)\n\n(.+)\n\n((?:[^\*+-].+(?:\n\n)*)*)((?:[\*]\s.+\n*)*)/g,
    noteRe = /[\*+-]\s/g;

function message2cm(msg) {
    let json = msg
        .replace(messageRe, '{ "changeType": "$1", "title": "$2", "issue": "$3", "description": "$4", "notes": "$5" }')
        .replace(/\n/g, ''),
        obj;

    try {
        obj = JSON.parse(json);
        obj.notes = _.filter(_.map(obj.notes.trim().split(noteRe), note => note.trim()), note => note);

        return obj;
    } catch (e) {
        return null;
    }
}

program
    .version('0.1.0')
    .usage('[options] [branchName]')
    .option('-t, --tip', 'only check the tip of the branch for a commit-meant')
    .option('-a, --all', 'check all commits on the branch for a commit-meant')
    .option('-l, --log <n>', 'output commit-meant history for last n commits on the branch')

    .option('-f, --field <name>', 'output the value of the commit-meant field with the specified name')

    .parse(process.argv);

let pwd = path.resolve('.'),
    repo,
    masterCommit;


function output(cm) {
    if (!cm) {
        console.log(NO_COMMIT_MEANT);
    } else if (program.field) {
        console.log(cm[program.field]);
    } else {
        console.log(cm);
    }
}

Git
    .Repository
    .open(pwd)
    .then(repository => {
        repo = repository;
        return repo
            .getMasterCommit()
            .then(commit => {
                masterCommit = commit;
                return program.args.length === 0 ? repo.getHeadCommit() : repo.getReferenceCommit(program.args[0]);
            });
    })
    .then(headCommit => {
        if (program.zed) {
            output(message2cm(headCommit.message()));
        } else if (_.has(program, 'log')) {
            let history = headCommit.history(),
                c = program.log,
                log = [];

            history
                .on('commit', commit => {
                    if (--c >= 0) {
                        let obj = message2cm(commit.message());

                        if (obj) {
                            log.push(obj);
                        }
                    }
                });

            history
                .on('end', () => {
                    log.forEach(cm => {
                        output(cm);
                        console.log('\n\n');
                    });
                });

            history.start();
        } else {
            let history = headCommit.history(),
                cm,
                stop = false;

            history
                .on('commit', commit => {
                    if (!stop) {
                        stop = !program.all && Git.Graph.descendantOf(repo, masterCommit, commit);

                        if (!cm && !stop) {
                            cm = message2cm(commit.message());
                        }
                    }
                });

            history
                .on('end', () => {
                    output(cm);
                });

            history.start();
        }
    })
    .catch(err => {
        console.error(err);
    });
