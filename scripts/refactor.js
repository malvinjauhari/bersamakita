import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const moves = [
  { from: 'src/domains/access/AuthContext.tsx', to: 'src/context/AuthContext.tsx' },
  { from: 'src/domains/access', to: 'src/features/auth' },
  { from: 'src/domains/disaster', to: 'src/features/disaster' },
  { from: 'src/domains/donation', to: 'src/features/donation' },
  { from: 'src/domains/distribution', to: 'src/features/distribution' },
  { from: 'src/domains/admin', to: 'src/features/admin' },
  { from: 'src/domains/finance', to: 'src/features/finance' },
  { from: 'src/domains/operations', to: 'src/features/operations' },
  { from: 'src/domains/partner', to: 'src/features/partner' },
  { from: 'src/domains/public', to: 'src/features/public' },
  { from: 'src/integrations/bmkg/client.ts', to: 'src/services/bmkg.ts' },
  { from: 'src/integrations/duitku/payment-service.ts', to: 'src/services/duitku.ts' },
  { from: 'src/integrations/cloudinary/upload.ts', to: 'src/services/cloudinary.ts' },
  { from: 'src/integrations/firebase', to: 'src/services/firebase' }
];

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let fileMapping = {};

function scanDir(dir, baseFrom, baseTo) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseFrom, fullPath);
    const targetPath = path.join(baseTo, relPath);
    if (entry.isDirectory()) {
      scanDir(fullPath, baseFrom, baseTo);
    } else {
      fileMapping[fullPath] = targetPath;
    }
  }
}

for (const move of moves) {
  const fromPath = path.join(rootDir, move.from);
  const toPath = path.join(rootDir, move.to);
  if (fs.existsSync(fromPath)) {
    const stat = fs.statSync(fromPath);
    if (stat.isDirectory()) {
      scanDir(fromPath, fromPath, toPath);
    } else {
      fileMapping[fromPath] = toPath;
    }
  }
}

const allFiles = [];
function scanAll(dir) {
  if (!fs.existsSync(dir)) return;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    allFiles.push(dir);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) {
      scanAll(fullPath);
    } else if (entry.isFile()) {
      allFiles.push(fullPath);
    }
  }
}
scanAll(path.join(rootDir, 'src'));
scanAll(path.join(rootDir, 'server.ts'));

let finalLocations = {};
for (const file of allFiles) {
  if (fileMapping[file]) {
    finalLocations[file] = fileMapping[file];
  } else {
    finalLocations[file] = file;
  }
}

function resolveOldImport(sourceFile, importStr) {
  if (!importStr.startsWith('.')) return null;
  const dir = path.dirname(sourceFile);
  let absImport = path.resolve(dir, importStr);
  
  const possibleExts = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', ''];
  for (const ext of possibleExts) {
    if (finalLocations[absImport + ext]) return absImport + ext;
  }
  return null;
}

console.log("Moving files...");
for (const [oldPath, newPath] of Object.entries(fileMapping)) {
  ensureDir(newPath);
  fs.renameSync(oldPath, newPath);
  console.log(`Moved ${path.relative(rootDir, oldPath)} -> ${path.relative(rootDir, newPath)}`);
}

try { fs.rmSync(path.join(rootDir, 'src/domains'), { recursive: true, force: true }); } catch (e) {}
try { fs.rmSync(path.join(rootDir, 'src/integrations'), { recursive: true, force: true }); } catch (e) {}

console.log("Updating imports...");
const extensions = ['.ts', '.tsx', '.js', '.jsx'];
const filesToProcess = Object.values(finalLocations).filter(f => extensions.includes(path.extname(f)));
filesToProcess.push(path.join(rootDir, 'src/App.tsx'));
filesToProcess.push(path.join(rootDir, 'src/main.tsx'));
filesToProcess.push(path.join(rootDir, 'server.ts'));

for (const file of filesToProcess) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  const importRegex = /(from\s+['"]|import\(['"])([^'"]+)(['"])/g;
  
  content = content.replace(importRegex, (match, prefix, importPath, suffix) => {
    if (!importPath.startsWith('.')) return match;
    
    const oldFile = Object.keys(finalLocations).find(k => finalLocations[k] === file) || file;
    const oldTarget = resolveOldImport(oldFile, importPath);
    
    if (oldTarget && finalLocations[oldTarget]) {
      const newTarget = finalLocations[oldTarget];
      let newRel = path.relative(path.dirname(file), newTarget);
      if (!newRel.startsWith('.')) newRel = './' + newRel;
      
      if (!importPath.endsWith('.ts') && !importPath.endsWith('.tsx') && !importPath.endsWith('.js') && !importPath.endsWith('.jsx')) {
         newRel = newRel.replace(/\.(tsx|ts|jsx|js)$/, '');
         if (newRel.endsWith('/index')) newRel = newRel.replace(/\/index$/, '');
      }
      
      if (importPath.endsWith('.js') && newRel.endsWith('.ts')) {
         newRel = newRel.replace(/\.ts$/, '.js');
      }
      
      newRel = newRel.replace(/\\/g, '/');
      return `${prefix}${newRel}${suffix}`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated imports in ${path.relative(rootDir, file)}`);
  }
}

console.log("Frontend refactor completed!");
