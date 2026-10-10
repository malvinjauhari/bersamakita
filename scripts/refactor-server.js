import fs from 'fs';
import path from 'path';

const rootDir = path.resolve('.');
const serverFile = path.join(rootDir, 'server.ts');

if (!fs.existsSync(serverFile)) {
    console.log("server.ts not found, assuming already refactored.");
    process.exit(0);
}

const content = fs.readFileSync(serverFile, 'utf8');

// We have already created server/app.ts and server/routes/bmkg.ts manually.
// Let's create the other routes by extracting text using a regex or simple split, 
// actually we can just manually output the content.

function writeRoute(name, imports, code) {
    const header = `import { Router, Request, Response } from 'express';\n${imports}\n\nconst router = Router();\n\n`;
    const footer = `\nexport default router;\n`;
    fs.writeFileSync(path.join(rootDir, 'server', 'routes', name), header + code + footer);
}

// 1. Extract payments route
const paymentStartStr = "app.post('/api/payments/duitku/create'";
const paymentStartIdx = content.indexOf(paymentStartStr);
const paymentEndIdx = content.indexOf("// Public transparency summary");
let paymentCode = content.substring(paymentStartIdx, paymentEndIdx);
paymentCode = paymentCode.replace(/app\.post\('\/api\/payments\/duitku/g, "router.post('");
paymentCode = paymentCode.replace(/app\.get\('\/api\/payments\/duitku/g, "router.get('");

const paymentImports = `import crypto from 'crypto';
import { adminDb } from '../../src/config/firebase-admin.js';
import { calculateAdminFee, calculateTotalPayment } from '../../src/lib/fees.js';`;

writeRoute('payments.ts', paymentImports, paymentCode);

// 2. Extract transparency route
const transStartStr = "app.get('/api/transparency/summary'";
const transStartIdx = content.indexOf(transStartStr);
const transEndIdx = content.indexOf("// Admin-protected endpoint");
let transCode = content.substring(transStartIdx, transEndIdx);
transCode = transCode.replace(/app\.get\('\/api\/transparency/g, "router.get('");

const transImports = `import { adminDb } from '../../src/config/firebase-admin.js';
import { ADMIN_FEE_RATE } from '../../src/lib/fees.js';`;

writeRoute('transparency.ts', transImports, transCode);

// 3. Extract admin route
const adminStartStr = "app.post('/api/admin/create-partner'";
const adminStartIdx = content.indexOf(adminStartStr);
const adminEndIdx = content.indexOf("// Cloudinary signed-upload");
let adminCode = content.substring(adminStartIdx, adminEndIdx);
adminCode = adminCode.replace(/app\.post\('\/api\/admin/g, "router.post('");

const adminImports = `import { adminDb, adminAuth } from '../../src/config/firebase-admin.js';`;

writeRoute('admin.ts', adminImports, adminCode);

// 4. Extract images route
const imgStartStr = "app.post('/api/images/sign'";
const imgStartIdx = content.indexOf(imgStartStr);
const imgEndIdx = content.indexOf("async function startServer()");
let imgCode = content.substring(imgStartIdx, imgEndIdx);
imgCode = imgCode.replace(/app\.post\('\/api\/images/g, "router.post('");

const imgImports = `import crypto from 'crypto';\nimport { adminDb, adminAuth } from '../../src/config/firebase-admin.js';`;

writeRoute('images.ts', imgImports, imgCode);

console.log("Server refactor split successful.");
