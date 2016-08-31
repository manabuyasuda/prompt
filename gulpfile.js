var gulp = require('gulp');

// Pug
var pug = require('gulp-pug');
var data = require('gulp-data');

// Sass
var sass = require('gulp-sass')
var autoprefixer = require('gulp-autoprefixer');
var csscomb = require('gulp-csscomb');
var cleanCss = require('gulp-clean-css')

// Image
var imagemin = require('gulp-imagemin');

// Iconfont
var iconfont = require('gulp-iconfont');
var iconfontCss = require('gulp-iconfont-css');

// Utility
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');
var notify = require("gulp-notify");
var concat = require('gulp-concat');
var rimraf = require('rimraf');

var develop = {
  'pug': ['develop/**/*.pug', '!' + 'develop/**/_*.pug'],
  'sass': 'develop/**/*.scss',
  'js': ['develop/**/*.js', '!' + 'develop/assets/js/bundle/**/*.js'],
  'bundleJs': 'develop/assets/js/bundle/**/*.js',
  'image': ['develop/**/*.{png,jpg,gif,svg}', '!' + 'develop/assets/icon/*.svg', '!' + 'develop/assets/font/*.svg'],
  'iconfont': 'develop/assets/icon/*.svg'
}

var release = {
  'root': 'release/',
  'pug': 'release/',
  'bundleJs': 'release/assets/js/bundle/',
  'iconfont': 'develop/assets/font/'
}

var AUTOPREFIXER_BROWSERS = [
  // @see https://github.com/ai/browserslist#browsers
  // Major Browsers（主要なブラウザの指定）
  'last 2 version', // （Major Browsersの）最新2バージョン
  // 'Chrome >= 34', // Google Chrome34以上
  // 'Firefox >= 30', // Firefox30以上
  'ie >= 9', // IE9以上
  // 'Edge >= 12', // Edge12以上
  'iOS >= 7', // iOS7以上
  // 'Opera >= 23', // Opera23以上
  // 'Safari >= 7', // Safari7以上

  // Other（Androidなどのマイナーなデバイスの指定）
  'Android >= 4.0' // Android4.0以上
];

/**
 * `.pug`をコンパイルしてから、リリースディレクトリに出力します。
 * JSONの読み込み、ルート相対パス、Pugの整形に対応しています。
 */
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
  .pipe(gulp.dest(release.pug))
  .pipe(browserSync.reload({stream: true}));
});


/**
 * `.scss`をコンパイルしてから、リリースディレクトリに出力します。
 * ベンダープレフィックスを付与後、csscombで整形されます。
 */
gulp.task('sass', function(){
  return gulp.src(develop.sass, {base: develop.root})
  .pipe(sourcemaps.init())
  .pipe(sass().on('error', sass.logError))
  .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
  .pipe(autoprefixer({
    browsers: AUTOPREFIXER_BROWSERS,
  }))
  .pipe(csscomb())
  // CSSのMinify
  // .pipe(cleanCss())
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(release.root))
  .pipe(browserSync.reload({stream: true}));
});

/**
 * デフォルトjsファイルとjQueryをリリースディレクトリに出力します。
 */
gulp.task('js', function() {
  return gulp.src(develop.js, {base: develop.root})
  .pipe(gulp.dest(release.root))
  .pipe(browserSync.reload({stream: true}));
});

/**
 * デベロップディレクトリにあるjQueryプラグインなどのファイルを連結してリリースディレクトリに出力します。
 */
gulp.task('bundleJs', function() {
  return gulp.src(develop.bundleJs)
  .pipe(sourcemaps.init())
  .pipe(concat('bundle.js'))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(release.bundleJs))
  .pipe(browserSync.reload({stream: true}));
});

/**
 * デベロップディレクトリの画像を圧縮、
 * 階層構造を維持したまま、リリースディレクトリに出力します。
 */
gulp.task('image', function() {
  return gulp.src(develop.image)
  .pipe(imagemin({
    // jpgをロスレス圧縮（画質を落とさず、メタデータを削除）。
    progressive: true,
    // gifをインターレースgifにします。
    interlaced: true,
    // PNGファイルの圧縮率（7が最高）を指定します。
    optimizationLevel: 7
  }))
  .pipe(gulp.dest(release.root))
  .pipe(browserSync.reload({stream: true}));
});

/**
 * アイコンフォントを作成します。
 * 開発用ディレクトリのiconディレクトリ内にSVGファイルを保存すると、
 * assets/fontディレクトリにフォントファイルが、
 * assets/css/object/projectディレクトリに専用のscssファイルが生成されます。
 * フォントファイルはリリースディレクトリにコピーされます。
 */
gulp.task('createIconfont', function(){
  var fontName = 'iconfont';
  return gulp.src(develop.iconfont)
    .pipe(iconfontCss({
      fontName: fontName, // 生成されるフォントの名前（iconfontと同じにするため変数化）
      path: 'develop/assets/icon/template/_icon.scss',  // アイコンフォント用CSSのテンプレートファイル
      targetPath: '../css/object/project/_icon.scss',  // scssファイルを出力するパス（gulp.destの出力先からみた相対パス）
      fontPath: '../font/' // 最終的に出力されるCSSからみた、フォントファイルまでの相対パス
    }))
    .pipe(iconfont({
      fontName: fontName,
      formats: ['ttf', 'eot', 'woff', 'svg'], // 出力するフォントファイルの形式
      // startUnicode: 0xF001,
      // appendCodepoints: false
      // normalize: true,
      // fontHeight: 500
    }))
    .pipe(gulp.dest(release.iconfont));
});

gulp.task('copyIconfont', function() {
  return gulp.src('develop/assets/font/*.{woff,eot,svg,ttf}')
    .pipe(gulp.dest('release/assets/font/'));
});

gulp.task('iconfont', function() {
  runSequence(
    'createIconfont',
    'copyIconfont'
  )
});


/**
 * リリースディレクトリを削除します。
 */
gulp.task('clean', function (cb) {
  rimraf(release.root, cb);
});

/**
 * 一連のタスクを処理します（画像の圧縮は`release`タスクでおこないます）。
 */
gulp.task('build', ['pug', 'sass', 'js', 'bundleJs', 'image', 'iconfont']);

/**
 * watchタスクを指定します。
 */
gulp.task('watch', ['build'], function() {
  gulp.watch(develop.pug, ['pug']);
  gulp.watch(develop.sass, ['sass']);
  gulp.watch(develop.js, ['js']);
  gulp.watch(develop.bundleJs, ['bundleJs']);
  gulp.watch(develop.image, ['image']);
  gulp.watch(develop.iconfont, ['iconfont']);
});


/**
 * ローカルサーバーを起動します。
 */
gulp.task('browser-sync', function() {
  browserSync({
    server: {
      baseDir: release.root,
      index: "index.html"
    }
  });
});

/**
 * 開発に使用するタスクです。
 * `gulp`タスクにbrowser-syncを追加します。
 * ローカルサーバーを起動し、リアルタイムに更新を反映させます。
 */
gulp.task('default', ['clean'], function() {
  runSequence(
    'watch',
    'browser-sync'
  )
});
