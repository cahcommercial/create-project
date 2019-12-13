/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve, basename } from 'path'
import { spawn } from 'child_process'

const pkgDir = resolve(__dirname, '..')
const isRoot = process.argv.includes('--root')

const readJson = (file: string): JSON => JSON.parse(readFileSync(join(pkgDir, file), 'utf-8')),
  cpfPackageJson = readJson('package.json') as any,
  tsconfigJson = readJson('tsconfig.json'),
  vsCodeExtensions = readJson('vscode/extentions.json'),
  vsCodeSettings = readJson('vscode/settings.json'),
  license = readFileSync(join(pkgDir, 'LICENSE'), 'utf-8').replace('2019', new Date().getFullYear().toString())

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let outPkg: any = {}

try {
  outPkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json')).toString())
} catch (e) {
  void e
}

outPkg.name = outPkg.name || basename(process.cwd())
outPkg.version = outPkg.version || '0.0.1'
outPkg.scripts = cpfPackageJson.scripts
outPkg.devDependencies = cpfPackageJson.devDependencies
outPkg.files = ['lib', '!**/*.spec.js']
outPkg.jest = cpfPackageJson.jest
outPkg.commitlint = cpfPackageJson.commitlint
outPkg.main = `lib/${outPkg.name}`
outPkg.license = outPkg.license || 'MIT'
outPkg.private = true
outPkg.eslintConfig = cpfPackageJson.eslintConfig
outPkg.prettier = cpfPackageJson.pretter

function tryAction(fn: any): void {
  try {
    fn()
  } catch (e) {
    console.error('Failed trying to run init\n\t' + e.message)
  }
}

let cwd = process.cwd()
const arg1 = process.argv[2]
if (arg1) {
  cwd = resolve(cwd, arg1)
  console.log('Creating project directory: ' + arg1)
  tryAction(() => mkdirSync(cwd))
} else {
  console.log('Creating project in current directory')
}

console.log('Writing package files...')

tryAction(() => mkdirSync(join(cwd, 'src')))
if (isRoot) {
  tryAction(() => mkdirSync(join(cwd, '.vscode')))
  tryAction(() => writeFileSync(join(cwd, '.vscode', 'extensions.json'), JSON.stringify(vsCodeExtensions, null, 2)))
  tryAction(() => writeFileSync(join(cwd, '.vscode', 'settings.json'), JSON.stringify(vsCodeSettings, null, 2)))
  tryAction(() =>
    writeFileSync(
      join(cwd, '.gitignore'),
      `
.DS_Store
node_modules
dist
lib`.trim()
    )
  )
}

tryAction(() => writeFileSync(join(cwd, 'tsconfig.json'), JSON.stringify(tsconfigJson, null, 2)))
tryAction(() => writeFileSync(join(cwd, 'package.json'), JSON.stringify(outPkg, null, 2)))
tryAction(() => writeFileSync(join(cwd, 'LICENSE'), license))

console.log('Running npm install...')
const npm = 'npm' + (process.platform === 'win32' ? '.cmd' : '')
spawn(npm, ['install'], { cwd, stdio: 'inherit' })
