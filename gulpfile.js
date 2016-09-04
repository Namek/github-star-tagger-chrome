'use strict'

const gulp = require('gulp')
const ts = require('gulp-typescript')
const clean = require('gulp-clean')

const Path = {
  tsConfig: 'tsconfig.json',
  notCode: './src/**/!(*.ts)',
  decls: './src/decls',
  outDir: './build'
}


let tsProject = ts.createProject(Path.tsConfig)

gulp.task('compile', () => {
  return tsProject.src()
    .pipe(ts(tsProject))
    .js.pipe(gulp.dest(Path.outDir))
})

gulp.task('copy_assets', () => {
    gulp.src(Path.notCode)
      .pipe(gulp.dest(Path.outDir))
})

gulp.task('watch', () => {
  const paths = [...require(`./${Path.tsConfig}`).files, Path.tsConfig]
  let watcher = gulp.watch(paths, ['compile'])
  watcher.on('change', (event) => {
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    if (event.path)
    tsProject = ts.createProject(Path.tsConfig)
  })
})

gulp.task('clean', () => 
  gulp.src(Path.outDir, {read: false})
    .pipe(clean())
)

gulp.task('build', ['clean', 'copy_assets', 'compile'])

gulp.task('default', ['build', 'watch'])
