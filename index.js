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

function message2obj(msg) {
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
    .usage('[options]')
    .option('-h, --head', 'only check the HEAD commit')
    .option('-a, --all', 'check all ancestor commits')
    .option('-l, --log <n>', 'output commit-meants for last n commits')

    .parse(process.argv);

let pwd = path.resolve('.'),
    repo,
    masterCommit;

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
        if (program.head) {
            console.log(message2obj(headCommit.message()) || NO_COMMIT_MEANT);
        } else if (_.has(program, 'log')) {
            let history = headCommit.history(),
                c = program.log,
                log = [];

            history
                .on('commit', commit => {
                    if (--c >= 0) {
                        let obj = message2obj(commit.message());

                        if (obj) {
                            log.push(obj);
                        }
                    }
                });

            history
                .on('end', () => {
                    console.log(log);
                });

            history.start();
        } else {
            let history = headCommit.history(),
                obj,
                stop = false;

            history
                .on('commit', commit => {
                    if (!stop) {
                        stop = !program.all && Git.Graph.descendantOf(repo, masterCommit, commit);

                        if (!obj && !stop) {
                            obj = message2obj(commit.message());
                        }
                    }
                });

            history
                .on('end', () => {
                    if (obj) {
                        console.log(obj);
                    } else {
                        console.log(NO_COMMIT_MEANT);
                    }
                });

            history.start();
        }
    })
    .catch(err => {
        console.error(err);
    });
