/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve, basename } from 'path'
import parseArgv = require('minimist')
import { spawn } from 'child_process'

const pkgDir = resolve(__dirname, '..'),
  args = parseArgv(process.argv),
  isRoot = args.root,
  project = args._[2],
  readJson = (file: string): JSON => JSON.parse(readFileSync(join(pkgDir, file), 'utf-8')),
  pkgJson = readJson('package.json') as any,
  tsconfigJson = readJson('tsconfig.json'),
  vsCodeExtensions = readJson('vscode/extentions.json'),
  vsCodeSettings = readJson('vscode/settings.json'),
  license = readFileSync(join(pkgDir, 'LICENSE'), 'utf-8').replace('2019', new Date().getFullYear().toString())

let outPkg: any = {}

try {
  outPkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json')).toString())
} catch (e) {
  void e
}

const devDeps = Object.assign({}, outPkg.devDependencies, pkgJson.devDependencies)
delete devDeps['@types/minimist']

Object.assign(outPkg, 'private' in outPkg ? { private: outPkg.private } : {})

outPkg.name = outPkg.name || project || basename(process.cwd())
outPkg.version = outPkg.version || '0.0.1'
outPkg.license = outPkg.license || 'MIT'
outPkg.main = outPkg.main || `lib/${outPkg.name}`
outPkg.files = ['lib', '!**/*.spec.js'].concat(outPkg.files || [])
outPkg.scripts = pkgJson.scripts
outPkg.dependencies = outPkg.dependencies || {}
outPkg.devDependencies = devDeps
outPkg.jest = pkgJson.jest
outPkg.prettier = pkgJson.prettier
outPkg.commitlint = pkgJson.commitlint
outPkg.eslintConfig = pkgJson.eslintConfig

if (!isRoot) {
  delete outPkg.scripts.commitlint
  outPkg.scripts.prepublishOnly = outPkg.scripts.prepublishOnly.replace(' && npm run commitlint', '')
  delete outPkg.commitlint
  delete outPkg.devDependencies['@commitlint/cli']
  delete outPkg.devDependencies['@commitlint/config-angular']
}

function tryAction(fn: any): void {
  try {
    fn()
  } catch (e) {
    console.error('Failed trying to run init\n\t' + e.message)
  }
}

let cwd = process.cwd()
if (project) {
  cwd = resolve(cwd, project)
  console.log('Creating project directory: ' + project)
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
