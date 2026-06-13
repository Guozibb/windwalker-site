const express = require('express');
const compression = require('compression');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(compression({ threshold: 500 })); // gzip/brotli for responses >500B
app.use(express.json({ limit: '50mb' }));

// Static files with cache headers
const ONE_YEAR = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

app.use(express.static(__dirname, {
    setHeaders(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        // Immutable hashed assets
        if (['.webp', '.png', '.jpg', '.jpeg', '.mp4', '.webm', '.woff2', '.woff'].includes(ext)) {
            res.setHeader('Cache-Control', ONE_YEAR);
        // Optimized folder — long cache
        } else if (filePath.includes(path.sep + 'optimized' + path.sep)) {
            res.setHeader('Cache-Control', ONE_YEAR);
        // HTML / JSON — revalidate
        } else if (['.html', '.json'].includes(ext)) {
            res.setHeader('Cache-Control', NO_CACHE);
        }
    }
}));

// File upload config
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'uploads'),
    filename: (req, file, cb) => {
        const unique = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        cb(null, unique + '_' + file.originalname);
    }
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

// Ensure data/uploads directories
['data', 'uploads'].forEach(d => {
    const p = path.join(__dirname, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Data file paths
const dataFile = (name) => path.join(__dirname, 'data', name + '.json');

function readData(name) {
    try { return JSON.parse(fs.readFileSync(dataFile(name), 'utf8')); }
    catch(e) { return null; }
}
function writeData(name, data) {
    fs.writeFileSync(dataFile(name), JSON.stringify(data, null, 2), 'utf8');
}

// ========== API Routes ==========

// Save all data (called by frontend after any change)
app.post('/api/save', (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: 'Missing key' });
        const current = readData(key) || {};
        // Merge value into current data
        const merged = { ...current, ...value };
        writeData(key, merged);
        res.json({ ok: true, key });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Load all data
app.get('/api/load', (req, res) => {
    try {
        const files = fs.readdirSync(path.join(__dirname, 'data'));
        const result = {};
        files.filter(f => f.endsWith('.json')).forEach(f => {
            const name = f.replace('.json', '');
            result[name] = readData(name) || {};
        });
        res.json(result);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file' });
        const filename = req.file.filename;
        res.json({ ok: true, filename, originalName: req.file.originalname, size: req.file.size });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// List uploaded files
app.get('/api/files', (req, res) => {
    try {
        const dir = path.join(__dirname, 'uploads');
        const files = fs.readdirSync(dir).map(f => ({
            name: f,
            size: fs.statSync(path.join(dir, f)).size,
            time: fs.statSync(path.join(dir, f)).mtime
        }));
        res.json(files);
    } catch(e) {
        res.json([]);
    }
});

// Get full data snapshot for backup
app.get('/api/backup', (req, res) => {
    try {
        const result = {};
        const dataDir = path.join(__dirname, 'data');
        if (fs.existsSync(dataDir)) {
            fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).forEach(f => {
                result[f.replace('.json', '')] = readData(f.replace('.json', ''));
            });
        }
        res.json(result);
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

const os = require('os');

function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

// ========== localtunnel 外网穿透（免费，无需注册） ==========
async function startTunnel() {
    try {
        const localtunnel = require('localtunnel');
        const tunnel = await localtunnel({ port: PORT });
        console.log(`  🌐 外网访问: ${tunnel.url}/login.html`);
        console.log(`     （任何网络、任何设备都能打开，无需注册）`);
        console.log(`     （只要电脑不关机，地址一直有效）\n`);
        tunnel.on('close', () => {
            console.log('  🌐 外网通道已断开，重启服务器即可恢复\n');
        });
    } catch(e) {
        console.log(`  🌐 外网通道启动失败: ${e.message}`);
        console.log(`     请检查网络连接后重启服务器\n`);
    }
}

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`\n  🚀 风之旅人 · 服务器已启动`);
    console.log(`  📡 本机访问: http://localhost:${PORT}/login.html`);
    const ips = getLocalIPs();
    if (ips.length) {
        console.log(`  📱 局域网访问: http://${ips[0]}:${PORT}/login.html`);
        ips.slice(1).forEach(ip => console.log(`               http://${ip}:${PORT}/login.html`));
    }
    await startTunnel();
});
