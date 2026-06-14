// 图片压缩脚本 — 自动扫描所有图片，转为 WebP（quality 60 / thumb 65）
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, 'optimized');
const THUMB_DIR = path.join(OUT_DIR, 'thumb');

// 扫描目录中所有图片文件
function scanImages(dir, excludeDirs = ['node_modules', 'optimized', '.git']) {
    const results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.isDirectory() && excludeDirs.includes(e.name)) continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                results.push(...scanImages(full, excludeDirs));
            } else {
                const ext = path.extname(e.name).toLowerCase();
                if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                    results.push(full);
                }
            }
        }
    } catch(_) {}
    return results;
}

// 视频处理列表（需要从 MP4 提取封面帧）
const VIDEO_LIST = [
    { path: '33ea4677255dc34cda1604eb32c008f5_raw.mp4', title: '角色动画预览 01' },
    { path: 'b4b52e12fd2c3a3cdc54697412a85b8d_raw.mp4', title: '角色动画预览 02' },
    { path: 'ca190fed84a363048cfe469a48f11a05_raw.mp4', title: '场景漫游预览' },
];

async function compressAll() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });

    // 扫描根目录 + uploads 目录
    const images = [
        ...scanImages(ROOT),
        ...scanImages(path.join(ROOT, 'uploads')),
    ];
    const uniqueImages = [...new Set(images)];

    // 排除视频封面帧（由 gen-video-covers.js 单独处理）
    const filtered = uniqueImages.filter(f => {
        const name = path.parse(f).name;
        return !name.endsWith('_raw');
    });

    console.log(`  🔍 扫描到 ${filtered.length} 张图片\n`);

    let totalBefore = 0, totalOpt = 0, totalThumb = 0;

    for (const srcPath of filtered) {
        if (!fs.existsSync(srcPath)) continue;

        const name = path.parse(srcPath).name;
        const beforeSize = fs.statSync(srcPath).size;
        totalBefore += beforeSize;

        // 大图：1920px 宽（全屏 lightbox 够用），WebP quality 55
        const optOut = path.join(OUT_DIR, name + '.webp');
        await sharp(srcPath)
            .resize(1920, undefined, { withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: 55, effort: 6 })
            .toFile(optOut);
        const optSize = fs.statSync(optOut).size;

        // 卡片缩略图：800px 宽（卡片渲染尺寸 ~400px，2x retina 800px 够用）
        const thumbOut = path.join(THUMB_DIR, name + '.webp');
        await sharp(srcPath)
            .resize(800, undefined, { withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: 60, effort: 6 })
            .toFile(thumbOut);
        const thumbSize = fs.statSync(thumbOut).size;

        totalOpt += optSize;
        totalThumb += thumbSize;
        const optPct = Math.round((1 - optSize / beforeSize) * 100);
        const thumbPct = Math.round((1 - thumbSize / beforeSize) * 100);
        const relPath = path.relative(ROOT, srcPath);
        console.log(`  ✅ ${relPath}  ${(beforeSize/1e6).toFixed(1)}MB → 大图${(optSize/1e3).toFixed(0)}KB(-${optPct}%) / 卡片${(thumbSize/1e3).toFixed(0)}KB(-${thumbPct}%)`);
    }

    console.log(`\n  📊 原图总计: ${(totalBefore/1e6).toFixed(1)}MB`);
    console.log(`  📊 优化大图: ${(totalOpt/1e6).toFixed(1)}MB（保存 ${Math.round((1-totalOpt/totalBefore)*100)}%）`);
    console.log(`  📊 卡片缩略: ${(totalThumb/1e6).toFixed(1)}MB`);
    console.log(`  📁 输出: optimized/`);
}

compressAll().catch(e => { console.error(e); process.exit(1); });
