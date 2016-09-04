var gulp = require('gulp');

// Pug
var pug = require('gulp-pug');
var fs = require('fs');

// Sass
var sass = require('gulp-sass')
var autoprefixer = require('gulp-autoprefixer');
var csscomb = require('gulp-csscomb');
var cleanCss = require('gulp-clean-css')

// Js
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

// Image
var imagemin = require('gulp-imagemin');

// Iconfont
var iconfont = require('gulp-iconfont');
var rename = require("gulp-rename");
var consolidate = require('gulp-consolidate');

// Styleguide
var aigis = require('gulp-aigis');

// Utility
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');
var notify = require("gulp-notify");
var rimraf = require('rimraf');

/**
 * 開発用ディレクトリ
 */
var develop = {
  'pug': ['develop/**/*.pug', '!' + 'develop/**/_*.pug'],
  'json': 'develop/assets/json/',
  'sass': 'develop/**/*.scss',
  'js': ['develop/**/*.js', '!' + 'develop/assets/js/bundle/**/*.js'],
  'bundleJs': 'develop/assets/js/bundle/**/*.js',
  'image': ['develop/**/*.{png,jpg,gif,svg}', '!' + 'develop/assets/icon/*.svg', '!' + 'develop/assets/font/*.svg'],
  'iconfont': 'develop/assets/icon/*.svg',
  'iconfontCss': 'develop/assets/icon/template/_icon.scss',
  'iconfontHtml': 'develop/assets/icon/template/_icon.html'
}

/**
 * コンパイル先ディレクトリ
 */
var release = {
  'root': 'release/',
  'pug': 'release/',
  'bundleJs': 'release/assets/js/bundle/',
  'iconfont': 'develop/assets/font/',
  'iconfontCss': 'develop/assets/css/object/project/',
  'iconfontHtml': 'release/assets/iconfont/',
  'iconfontFont': 'release/assets/font/'
}

/**
 * 公開用ディレクトリ
 */
var public = {
  'root': 'htdocs/',
  'image': ['htdocs/**/*.{png,jpg,gif,svg}', '!' + 'htdocs/assets/icon/*.svg', '!' + 'htdocs/assets/font/*.svg'],
  'css': 'htdocs/**/*.css',
  'js': 'htdocs/**/*.js'
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
 * `.pug`をコンパイルしてから、releaseディレクトリに出力します。
 * JSONの読み込み、ルート相対パス、Pugの整形に対応しています。
 */
gulp.task('pug', function() {
  // JSONファイルの読み込み。
  var locals = {
    'site': JSON.parse(fs.readFileSync(develop.json + 'site.json')),
    'data': JSON.parse(fs.readFileSync(develop.json + 'data.json'))
  }
  return gulp.src(develop.pug)
  .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
  .pipe(pug({
    // JSONファイルをPugに渡します。
    locals: locals,
    // Pugファイルのルートディレクトリを指定します。
    // `/assets/pug/_layout`のようにルート相対パスを使います。
    basedir: 'develop',
    // Pugファイルの整形。
    pretty: true
  }))
  .pipe(gulp.dest(release.pug))
  .pipe(browserSync.reload({stream: true}));
});


/**
 * `.scss`をコンパイルしてから、releaseディレクトリに出力します。
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
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(release.root))
  .pipe(browserSync.reload({stream: true}));
});

/**
 * デフォルトjsファイルとjQueryをreleaseディレクトリに出力します。
 */
gulp.task('js', function() {
  return gulp.src(develop.js, {base: develop.root})
  .pipe(gulp.dest(release.root))
  .pipe(browserSync.reload({stream: true}));
});

/**
 * developディレクトリにあるjQueryプラグインなどのファイルを連結してreleaseディレクトリに出力します。
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
 * developディレクトリの画像を階層構造を維持したまま、releaseディレクトリに出力します。
 */
gulp.task('image', function() {
  return gulp.src(develop.image)
  .pipe(gulp.dest(release.root))
  .pipe(browserSync.reload({stream: true}));
});

/**
 * SVGからアイコンフォントを生成します。
 * アイコンフォント用のSassファイルとHTMLファイルも生成します。
 */
gulp.task('iconfont', function() {
  // シンボルフォント名を指定します。
  var fontName = 'icon';
  return gulp.src(develop.iconfont)
  .pipe(iconfont({
    fontName: fontName,
    formats: ['ttf', 'eot', 'woff', 'svg'],
    // SVGファイル名にUnicodeを付与します（recommended option）。
    prependUnicode: true
  }))
  .on('glyphs', function(codepoints, opt) {
    var options = {
      glyphs: codepoints,
      fontName: fontName,
      // CSSファイルからfontファイルまでの相対パスを指定します。
      fontPath: '../font/',
      // CSSのクラス名を指定します。
      className: 'p-icon'
    };
    // CSSのテンプレートからSassファイルを生成します。
    gulp.src(develop.iconfontCss)
    .pipe(consolidate('lodash', options))
    .pipe(rename({
      basename: '_icon'
    }))
    .pipe(gulp.dest(release.iconfontCss));
    // アイコンフォントのサンプルHTMLを生成します。
    gulp.src(develop.iconfontHtml)
    .pipe(consolidate('lodash', options))
    .pipe(rename({
      basename: 'iconfont'
    }))
    .pipe(gulp.dest(release.iconfontHtml))
  })
  .pipe(gulp.dest(release.iconfontFont));
});

/**
 * スタイルガイドを生成します。
 */
gulp.task('aigis', function() {
  return gulp.src('./aigis/aigis_config.yml')
    .pipe(aigis());
});

/**
 * styleguideディレクトリを削除します。
 */
gulp.task('clean-styleguide', function (cb) {
  rimraf('styleguide/', cb);
});

/**
 * スタイルガイドを生成します。
 */
gulp.task('styleguide', ['clean-styleguide'], function() {
  runSequence('aigis')
});

/**
 * releaseディレクトリを削除します。
 */
gulp.task('clean-release', function (cb) {
  rimraf(release.root, cb);
});

/**
 * 一連のタスクを処理します（画像の圧縮は`gulp public`タスクでおこないます）。
 */
gulp.task('build', ['iconfont'], function() {
  runSequence(
    ['pug', 'sass', 'js', 'bundleJs', 'image']
    )
});

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
gulp.task('default', ['clean-release'], function() {
  runSequence(
    'watch',
    'browser-sync'
  )
});

/**
 * publicディレクトリを削除します。
 */
gulp.task('clean-public', function (cb) {
  rimraf(public.root, cb);
});

/**
 * releaseディレクトリをpublicディレクトリにコピーします。
 */
gulp.task('copy-release', function() {
  return gulp.src(release.root + '**/')
  .pipe(gulp.dest(public.root));
});

/**
 * publicディレクトリ内の画像を圧縮します。
 */
gulp.task('minify-image-public', function() {
  return gulp.src(public.image)
  .pipe(imagemin({
    // jpgをロスレス圧縮（画質を落とさず、メタデータを削除）。
    progressive: true,
    // gifをインターレースgifにします。
    interlaced: true,
    // PNGファイルの圧縮率（7が最高）を指定します。
    optimizationLevel: 7
  }))
  .pipe(gulp.dest(public.root));
});

/**
 * publicディレクトリ内のCSSをMinifyします。
 */
gulp.task('minify-css-public', function() {
  return gulp.src(public.css, {base: public.root})
  .pipe(sourcemaps.init())
  .pipe(autoprefixer({
    browsers: AUTOPREFIXER_BROWSERS,
  }))
  .pipe(csscomb())
  .pipe(cleanCss())
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(public.root));
});

/**
 * publicディレクトリ内のJSをMinifyします。
 */
gulp.task('minify-js-public', function() {
  return gulp.src(public.js, {base: public.root})
  .pipe(uglify({preserveComments: 'license'}))
  .pipe(gulp.dest(public.root));
});

/**
 * サーバーにあげる公開用のファイルを生成するタスクです。
 * releaseディレクトリのファイルをコピーし、Minifyします。
 */
gulp.task('public', ['clean-public'], function() {
  runSequence(
    'copy-release',
    ['minify-image-public', 'minify-css-public', 'minify-js-public']
  )
});

