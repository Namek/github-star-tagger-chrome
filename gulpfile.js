'use strict'

const gulp = require('gulp')
const ts = require('gulp-typescript')
const clean = require('gulp-clean')
const sequence = require('gulp-sequence')

const Path = {
  tsConfig: 'tsconfig.json',
  copyable: './src/**/*.@(html|css|json|png|js)',
  decls: './src/decls',
  outDir: './build'
}


let tsProject = ts.createProject(Path.tsConfig)

gulp.task('compile', () =>
  tsProject.src()
    .pipe(ts(tsProject))
    .js.pipe(gulp.dest(Path.outDir))
)

gulp.task('copy_assets', () =>
  gulp.src(Path.copyable)
    .pipe(gulp.dest(Path.outDir))
)

gulp.task('watch', () => {
  const tsPaths = [...require(`./${Path.tsConfig}`).files, Path.tsConfig]
  let tsWatcher = gulp.watch(tsPaths, ['compile'])
  tsWatcher.on('change', evt => {
    console.log('File ' + evt.path + ' was ' + evt.type + ', compiling...')
    tsProject = ts.createProject(Path.tsConfig)
  })

  let assetWatcher = gulp.watch(Path.copyable, ['copy_assets'])
  assetWatcher.on('change', evt => {
    console.log('File ' + evt.path + ' was ' + evt.type + ', copying assets...')
  })
})

gulp.task('clean', () => 
  gulp.src(Path.outDir, {read: false})
    .pipe(clean())
)

gulp.task('build', sequence('clean', 'copy_assets', 'compile'))

gulp.task('default', sequence('build', 'watch'))
