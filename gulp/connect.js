'use strict';

var conf = require('./conf'),
    connect = require('gulp-connect'),
    gulp = require('gulp');

gulp.task('connect', async function() {
    connect.server({
        livereload: true,
        root: conf.paths.docs
    });
});