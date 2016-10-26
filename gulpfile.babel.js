import gulp from 'gulp';

// Pug
import pug from 'gulp-pug';
import fs from 'fs';
import data from 'gulp-data';
import path from 'path';

// Sass
import sass from 'gulp-sass';
import autoprefixer from 'gulp-autoprefixer';
import csscomb from 'gulp-csscomb';
import cleanCss from 'gulp-clean-css';

// JavaScript(Babel)
import concat from 'gulp-concat';
import uglify from 'gulp-uglify';
import browserify from 'browserify';
import babelify from 'babelify';
import watchify from 'watchify';
import buffer from 'vinyl-buffer';
import source from 'vinyl-source-stream';

// Image
import imagemin from 'gulp-imagemin';

// Iconfont
import iconfont from 'gulp-iconfont';
import rename from 'gulp-rename';
import consolidate from 'gulp-consolidate';

// Styleguide
import aigis from 'gulp-aigis';

// Utility
import gulpLoadPlugins from 'gulp-load-plugins';
const $ = gulpLoadPlugins();
import runSequence from 'run-sequence';
import sourcemaps from 'gulp-sourcemaps';
import plumber from 'gulp-plumber';
import notify from "gulp-notify";
import rimraf from 'rimraf';
import browserSync from 'browser-sync';

/**
 * 開発用ディレクトリ
 */
const develop = {
  'pug': ['develop/**/*.pug', '!' + 'develop/**/_*.pug'],
  'json': 'develop/_data/',
  'sass': 'develop/**/*.scss',
  'js': 'develop/assets/js/main.js',
  'image': ['develop/**/*.{png,jpg,gif,svg}', '!' + 'develop/assets/icon/*.svg', '!' + 'develop/assets/font/*.svg'],
  'iconfont': 'develop/assets/icon/*.svg',
  'iconfontCss': 'develop/assets/icon/template/_icon.scss',
  'iconfontHtml': 'develop/assets/icon/template/_icon.html'
}

/**
 * コンパイル先ディレクトリ
 */
const release = {
  'root': 'release/',
  'pug': 'release/',
  'js': 'release/assets/js/',
  'iconfont': 'develop/assets/font/',
  'iconfontCss': 'develop/assets/css/object/project/',
  'iconfontHtml': 'release/assets/iconfont/',
  'iconfontFont': 'release/assets/font/'
}

/**
 * 公開用ディレクトリ
 */
const htdocs = {
  'root': 'htdocs/',
  'image': ['htdocs/**/*.{png,jpg,gif,svg}', '!' + 'htdocs/assets/icon/*.svg', '!' + 'htdocs/assets/font/*.svg'],
  'css': ['htdocs/**/*.css', '!' + 'htdocs/styleguide/**/*.css'],
  'js': ['htdocs/**/*.js', '!' + 'htdocs/styleguide/**/*.js']
}

const AUTOPREFIXER_BROWSERS = [
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
  const locals = {
    'site': JSON.parse(fs.readFileSync(develop.json + 'site.json')),
    'data': JSON.parse(fs.readFileSync(develop.json + 'data.json'))
  }
  return gulp.src(develop.pug)
  .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
  .pipe(data(function(file) {
    // 各ページごとの`/`を除いたルート相対パスを取得します。
    locals.relativePath = path.relative(file.base, file.path.replace(/.pug$/, '.html'));
      return locals;
  }))
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
 * Babelを使ってES2016を変換、watchifyでファイルの監視をします。
 */
function bundle(watching = false) {
  const b = browserify({
    entries: [develop.js],
    transform: ['babelify'],
    debug: true,
    plugin: (watching) ? [watchify] : null
  })
  .on('update', () => {
    bundler();
    console.log('scripts rebuild');
  });

  function bundler() {
    return b.bundle()
      .on('error', (err) => {
        console.log(err.message);
      })
      .pipe(source('bundle.js'))
      .pipe(buffer())
      .pipe($.sourcemaps.init({loadMaps: true}))
      .pipe($.sourcemaps.write('./'))
      .pipe(gulp.dest(release.js));
  }

  return bundler();
}

gulp.task('scripts', () => {
  bundle();
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
  const fontName = 'icon';
  return gulp.src(develop.iconfont)
  .pipe(iconfont({
    fontName: fontName,
    formats: ['ttf', 'eot', 'woff', 'svg'],
    // SVGファイル名にUnicodeを付与します（recommended option）。
    prependUnicode: true
  }))
  .on('glyphs', function(codepoints, opt) {
    const options = {
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
  rimraf('release/styleguide/', cb);
});

/**
 * releaseディレクトリの不要なiconfontディレクトリを削除します。
 */
gulp.task('clean-release-iconfont', function (cb) {
  rimraf('release/assets/iconfont/', cb);
});

/**
 * スタイルガイドを生成します。
 */
gulp.task('styleguide', ['clean-styleguide'], function() {
  runSequence(
    'aigis'
  )
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
    ['pug', 'sass', 'scripts', 'image'],
    )
});

/**
 * watchタスクを指定します。
 */
gulp.task('watch', ['build'], function() {
  bundle(true);
  gulp.watch(develop.pug, ['pug']);
  gulp.watch(develop.sass, ['sass']);
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
 * htdocsディレクトリを削除します。
 */
gulp.task('clean-htdocs', function (cb) {
  rimraf(htdocs.root, cb);
});

/**
 * releaseディレクトリをhtdocsディレクトリにコピーします。
 */
gulp.task('copy-release', function() {
  return gulp.src(release.root + '**/')
  .pipe(gulp.dest(htdocs.root));
});

/**
 * htdocsディレクトリ内の画像を圧縮します。
 */
gulp.task('minify-image-htdocs', function() {
  return gulp.src(htdocs.image)
  .pipe(imagemin({
    // jpgをロスレス圧縮（画質を落とさず、メタデータを削除）。
    progressive: true,
    // gifをインターレースgifにします。
    interlaced: true,
    // PNGファイルの圧縮率（7が最高）を指定します。
    optimizationLevel: 7
  }))
  .pipe(gulp.dest(htdocs.root));
});

/**
 * htdocsディレクトリ内のCSSをMinifyします。
 */
gulp.task('minify-css-htdocs', function() {
  return gulp.src(htdocs.css, {base: htdocs.root})
  .pipe(sourcemaps.init())
  .pipe(autoprefixer({
    browsers: AUTOPREFIXER_BROWSERS,
  }))
  .pipe(csscomb())
  .pipe(cleanCss())
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(htdocs.root));
});

/**
 * htdocsディレクトリ内のJSをMinifyします。
 */
gulp.task('minify-js-htdocs', function() {
  return gulp.src(htdocs.js, {base: htdocs.root})
  .pipe(uglify({preserveComments: 'license'}))
  .pipe(gulp.dest(htdocs.root));
});

/**
 * サーバーにあげる公開用のファイルを生成するタスクです。
 * releaseディレクトリのファイルをコピーし、Minifyします。
 */
gulp.task('htdocs', ['clean-htdocs'], function() {
  runSequence(
    'copy-release',
    ['minify-image-htdocs', 'minify-css-htdocs', 'minify-js-htdocs']
  )
});

