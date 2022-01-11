'use strict';

const { parallel } = require('gulp');
var gulp = require('gulp');
const { styles } = require('./styles.js');

var paths = {
    styles: {
        src: 'src/main/styles/*.scss'
    }
};

gulp.task('watch', async function() {
    //gulp.watch('src/main/fonts/**/*', gulp.series('fonts'));
    //gulp.watch('src/main/index.html', gulp.series('html'));
    gulp.watch('src/main/images/**/*', gulp.series('images'));
    //gulp.watch('src/main/json/**/*', gulp.series('json'));
    gulp.watch('src/main/scripts/**/*.js', gulp.series('scripts'));
    gulp.watch('src/main/styles/**/*.scss', gulp.series(styles));
    //gulp.watch(paths.styles.src);

});