'use strict';

var gulp = require('gulp'),
runSequence = require('gulp4-run-sequence');

const { images } = require('./images.js');
const { scripts } = require('./scripts.js');
const { styles } = require('./styles.js');
const { node_modules } = require('./node_modules.js');
const { connect } = require('./connect.js');
const { watch } = require('./watch.js');


// gulp.task('default', function(callback) {
//     runSequence('clean', 'images', 'scripts', 'styles', 'node_modules', 'connect', 'watch', callback);
// });

// require('./gulp/images')

gulp.task('default', gulp.series('clean', 'images', 'scripts', styles, 'node_modules', 'connect', 'watch'), function(done) {
    Promise.resolve(done());
});