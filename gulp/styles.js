'use strict';

var autoprefixer = require('gulp-autoprefixer'),
    conf = require('./conf'),
    connect = require('gulp-connect'),
    cssnano = require('gulp-cssnano'),
    // gulp = require('gulp'),
    rename = require('gulp-rename'),
    sass = require('gulp-sass')(require('sass'));

const { src, dest } = require('gulp');

var paths = {
    styles: {
        src: './src/main/styles/*.scss',
        dest: conf.paths.docs + '/css'
    }
};

// gulp.task('styles:build', function() {
//     return Promise.resolve(sass('src/main/styles/neo4jd3.scss', { style: 'expanded' })
//         .pipe(autoprefixer('last 2 version'))
//         .pipe(gulp.dest(conf.paths.docs + '/css'))
//         .pipe(rename({ suffix: '.min' }))
//         .pipe(cssnano())
//         .pipe(gulp.dest(conf.paths.docs + '/css'))
//         .pipe(connect.reload()));
// });

// gulp.task('styles', gulp.series('styles:build', function() {
//     return Promise.resolve(gulp.src([
//             conf.paths.docs + '/css/neo4jd3.css',
//             conf.paths.docs + '/css/neo4jd3.min.css'
//         ])
//         .pipe(gulp.dest(conf.paths.dist + '/css')));
// }));

// async function stylesBuild() {
//     return sass('src/main/styles/neo4jd3.scss', { style: 'expanded' })
//         .pipe(autoprefixer('last 2 version'))
//         .pipe(gulp.dest(conf.paths.docs + '/css'))
//         .pipe(rename({ suffix: '.min' }))
//         .pipe(cssnano())
//         .pipe(gulp.dest(conf.paths.docs + '/css'))
//         .pipe(connect.reload());
// }

// async function stylesCopy() {
//     gulp.src([
//         conf.paths.docs + '/css/neo4jd3.css',
//         conf.paths.docs + '/css/neo4jd3.min.css'
//     ])
//     .pipe(gulp.dest(conf.paths.dist + '/css'));
// }

// async function styles() {
//     return 
//         gulp
//         .src(paths.styles.src, {
//             sourcemaps: true
//         })
//         .pipe(sass())
//         .pipe(rename({
//             basename: 'neo4jd3',
//             suffix: '.min'
//         }))
//         .pipe(gulp.dest(paths.styles.dest));
    
// }

function styles(done) {
    src('src/main/styles/neo4jd3.scss')
    // .pipe(autoprefixer('last 2 version'))
    .pipe(sass().on('error', sass.logError))
    .pipe(cssnano())
    .pipe(rename({
        basename: 'neo4jd3',
        suffix: '.min'
    }))
    .pipe(dest('docs/css'));
   done();
  }


module.exports = {
    styles
}

// exports.styles = gulp.series(stylesBuild, stylesCopy)