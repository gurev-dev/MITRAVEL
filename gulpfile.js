const { src, dest, parallel, series, watch } = require('gulp'),
	sass = require('gulp-sass'),
	notify = require('gulp-notify'),
	rename = require('gulp-rename'),
	autoprefixer = require('gulp-autoprefixer'),
	cleanCSS = require('gulp-clean-css'),
	sourcemaps = require('gulp-sourcemaps'),
	browserSync = require('browser-sync').create(),
	fileinclude = require('gulp-file-include'),
	svgSprite = require('gulp-svg-sprite'),
	ttf2woff2 = require('gulp-ttf2woff2'),
	fs = require('fs'),
	del = require('del'),
	webpack = require('webpack'),
	webpackStream = require('webpack-stream'),
	uglify = require('gulp-uglify-es').default,
	imagemin = require('gulp-imagemin'),
	gutil = require('gulp-util'),
	ftp = require('vinyl-ftp'),
	rev = require('gulp-rev'),
	revRewrite = require('gulp-rev-rewrite'),
	revdel = require('gulp-rev-delete-original'),
	htmlmin = require('gulp-htmlmin');


//dev

const fonts = () => {
	return src('./src/fonts/*.ttf')
		.pipe(ttf2woff2())
		.pipe(dest('./app/fonts/'));
}

const checkWeight = (fontname) => {
	let weight = 400;
	switch (true) {
		case /Thin/.test(fontname):
			weight = 100;
			break;
		case /ExtraLight/.test(fontname):
			weight = 200;
			break;
		case /Light/.test(fontname):
			weight = 300;
			break;
		case /Regular/.test(fontname):
			weight = 400;
			break;
		case /Medium/.test(fontname):
			weight = 500;
			break;
		case /SemiBold/.test(fontname):
			weight = 600;
			break;
		case /Semi/.test(fontname):
			weight = 600;
			break;
		case /Bold/.test(fontname):
			weight = 700;
			break;
		case /ExtraBold/.test(fontname):
			weight = 800;
			break;
		case /Heavy/.test(fontname):
			weight = 700;
			break;
		case /Black/.test(fontname):
			weight = 900;
			break;
		default:
			weight = 400;
	}
	return weight;
}

const cb = () => { }

let srcFonts = './src/scss/_fonts.scss';
let appFonts = './app/fonts/';

const fontsStyle = (done) => {
	let file_content = fs.readFileSync(srcFonts);

	fs.writeFile(srcFonts, '', cb);
	fs.readdir(appFonts, function (err, items) {
		if (items) {
			let c_fontname;
			for (var i = 0; i < items.length; i++) {
				let fontname = items[i].split('.');
				fontname = fontname[0];
				let font = fontname.split('-')[0];
				let weight = checkWeight(fontname);

				if (c_fontname != fontname) {
					fs.appendFile(srcFonts, '@include font-face("' + font + '", "' + fontname + '", ' + weight + ');\r\n', cb);
				}
				c_fontname = fontname;
			}
		}
	})

	done();
}

const spriteSvg = () => {
	return src('./src/img/svg/*.svg')
		.pipe(svgSprite({
			mode: {
				stack: {
					sprite: "../sprite.svg" //sprite file name
				}
			},
		}))
		.pipe(dest('./app/img'));
}

const resources = () => {
	return src('./src/resources/**')
		.pipe(dest('./app'))
}

const styles = () => {
	return src('./src/scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded'
		}).on('error', notify.onError()))
		.pipe(rename({ suffix: '.min' }))
		.pipe(autoprefixer({
			overrideBrowserslist: ['last 8 versions '],
			cascade: false
		}))
		.pipe(cleanCSS({
			level: 2
		}))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('./app/css/'))
		.pipe(browserSync.stream());
}

const htmlInclude = () => {
	return src(['./src/*.html', '!./src/_*.html'])
		.pipe(fileinclude({
			prefix: '@',
			basepath: '@file'
		}))
		.pipe(dest('./app'))
		.pipe(browserSync.stream());
}

const imgToApp = () => {
	return src(['./src/img/**/*.{jpg,png,jpeg,gif,ico}'])
		.pipe(dest('./app/img'))
}

const clean = () => {
	return del(['app/*'])
}

const scripts = () => {
	return src('./src/js/main.js')
		.pipe(webpackStream({
			mode: 'development',
			output: {
				filename: 'main.js',
			},
			module: {
				rules: [{
					test: /\.m?js$/,
					exclude: /(node_modules|bower_components)/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: ['@babel/preset-env']
						}
					}
				}]
			},
		}))
		.on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end'); // Don't stop the rest of the task
		})

		.pipe(sourcemaps.init())
		.pipe(uglify().on("error", notify.onError()))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('./app/js'))
		.pipe(browserSync.stream());
}

const watchFiles = () => {
	browserSync.init({
		server: {
			baseDir: "./app"
		},
		notify: false,
	});

	watch('./src/scss/**/*.scss', styles);
	watch('./src/*.html', htmlInclude);
	watch('./src/img/**/*.{jpg,png,jpeg,gif,ico}', imgToApp);
	watch('./src/img/**/*.svg', spriteSvg);
	watch('./src/resources/**', resources);
	watch('./src/fonts/*.ttf', fonts);
	watch('./src/fonts/*.ttf', fontsStyle);
	watch('./src/js/**/*.js', scripts);
}

exports.fileinclude = htmlInclude;
exports.styles = styles;
exports.scripts = scripts;
exports.watchFiles = watchFiles;
exports.fonts = fonts;
exports.fontsStyle = fontsStyle;

exports.default = series(clean, parallel(htmlInclude, scripts, fonts, resources, imgToApp, spriteSvg), fontsStyle, styles, watchFiles);


// build

const imageMin = () => {
	return src('./src/images/**/*.{jpg,png,svg,gif,ico}')
		.pipe(imagemin({
			interlaced: true,
			progressive: true,
			svgoPlugins: [{ removeViewBox: false }],
			optimizationLevel: 3,  //0 or 7
		}))
		.pipe(dest('./app/images/'))
}

const stylesBuild = () => {
	return src('./src/scss/**/*.scss')
		.pipe(sass({
			outputStyle: 'expanded'
		}).on("error", notify.onError()))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(autoprefixer({
			cascade: false,
		}))
		.pipe(cleanCSS({
			level: 2
		}))
		.pipe(dest('./app/css/'))
}

const scriptsBuild = () => {
	return src('./src/js/main.js')
		.pipe(webpackStream(

			{
				mode: 'development',
				output: {
					filename: 'main.js',
				},
				module: {
					rules: [{
						test: /\.m?js$/,
						exclude: /(node_modules|bower_components)/,
						use: {
							loader: 'babel-loader',
							options: {
								presets: ['@babel/preset-env']
							}
						}
					}]
				},
			}))
		.on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end'); // Don't stop the rest of the task
		})
		.pipe(uglify().on("error", notify.onError()))
		.pipe(dest('./app/js'))
}

const cache = () => {
	return src('app/**/*.{css,js,svg,png,jpg,jpeg,woff2}', {
		base: 'app'
	})
		.pipe(rev())
		.pipe(revdel())
		.pipe(dest('app'))
		.pipe(rev.manifest('rev.json'))
		.pipe(dest('app'));
};

const rewrite = () => {
	const maniFest = src('app/rev.json');
	return src('app/**/*.html')
		.pipe(revRewrite({
			maniFest
		}))
		.pipe(dest('app'));
}

const htmlMinify = () => {
	return src('app/**/*.html')
		.pipe(htmlmin({
			collapseWhitespace: true
		}))
		.pipe(dest('app'));
}

exports.cache = series(cache, rewrite);

exports.build = series(clean, parallel(htmlInclude, scriptsBuild, fonts, resources, imgToApp, spriteSvg), fontsStyle, stylesBuild, htmlMinify, imageMin);


// deploy
const deploy = () => {
	let conn = ftp.create({
		host: '',
		user: '',
		password: '',
		parallel: 10,
		log: gutil.log
	});

	let globs = [
		'app/**',
	];

	return src(globs, {
		base: './app',
		buffer: false
	})
		.pipe(conn.newer('//')) // only upload newer files
		.pipe(conn.dest('//'));
}

exports.deploy = deploy;