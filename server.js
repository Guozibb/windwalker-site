const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

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

// ========== ngrok 外网穿透（可选） ==========
// 1. 浏览器打开 https://dashboard.ngrok.com/get-started/your-authtoken
// 2. 用 GitHub/Google 免费注册，复制你的 authtoken
// 3. 把下面空字符串替换成你的 token
const NGROK_TOKEN = '';

async function startNgrok() {
    if (!NGROK_TOKEN) {
        console.log('  🌐 外网访问: 未配置 ngrok token（跳过了）');
        console.log('     如需外网访问，请注册 https://ngrok.com 获取免费 token\n');
        return;
    }
    try {
        const ngrok = require('@ngrok/ngrok');
        const listener = await ngrok.forward({ addr: PORT, authtoken: NGROK_TOKEN });
        console.log(`  🌐 外网访问: ${listener.url()}/login.html`);
        console.log(`     （任何网络、任何设备都能打开）\n`);
    } catch(e) {
        console.log(`  🌐 ngrok 启动失败: ${e.message}`);
        console.log(`     请检查 token 是否正确，或稍后重试\n`);
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
    await startNgrok();
});
