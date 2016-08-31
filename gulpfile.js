var gulp = require('gulp');

// Pug
var pug = require('gulp-pug');
var data = require('gulp-data');

// Utility
var plumber = require('gulp-plumber');
var notify = require("gulp-notify");

var develop = {
  'pug': ['develop/**/*.pug', '!' + 'develop/**/_*.pug']
}

var release = {
  'pug': 'release/'
}

gulp.task('pug', function() {
  return gulp.src(develop.pug)
  .pipe(data(function() {
    return {
      // JSONファイルの読みこみ。
      'site': require('./develop/assets/json/site.json'),
      'data': require('./develop/assets/json/data.json')
    };
  }))
  .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
  .pipe(pug({
    // Pugファイルのルートディレクトリを指定する。
    // `/assets/pug/_layout`のようにルート相対パスが使える。
    basedir: 'develop',
    // Pugファイルの整形。
    pretty: true
  }))
  .pipe(gulp.dest(release.pug));
});

gulp.task('watch', function() {
  gulp.watch(develop.pug, ['pug']);
});