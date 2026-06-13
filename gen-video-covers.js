// 视频封面生成脚本 — 从 MP4 提取缩略图
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const VIDEOS = [
    { file: "33ea4677255dc34cda1604eb32c008f5_raw.mp4", title: "角色动画预览 01" },
    { file: "b4b52e12fd2c3a3cdc54697412a85b8d_raw.mp4", title: "角色动画预览 02" },
    { file: "ca190fed84a363048cfe469a48f11a05_raw.mp4", title: "场景漫游预览" },
];

async function generateThumb(inputFile, outputFile, seekTime) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
            .seekInput(seekTime)
            .frames(1)
            .output(outputFile)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}

async function processAll() {
    const outDir = path.join(__dirname, 'optimized');
    const thumbDir = path.join(__dirname, 'optimized', 'thumb');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

    for (const v of VIDEOS) {
        const srcPath = path.join(__dirname, v.file);
        if (!fs.existsSync(srcPath)) {
            console.log(`  ⚠ 跳过: ${v.file}`);
            continue;
        }

        const name = path.parse(v.file).name;
        const tmpPng = path.join(__dirname, `_tmp_${name}.png`);

        // 提取视频帧（取第2秒）
        console.log(`  🎬 ${v.title} — 提取封面帧...`);
        await generateThumb(srcPath, tmpPng, 2);

        // 转 WebP 大图（quality 70）
        const optOut = path.join(outDir, name + '.webp');
        await sharp(tmpPng)
            .webp({ quality: 70, effort: 6 })
            .toFile(optOut);
        const optSize = fs.statSync(optOut).size;

        // 转 WebP 缩略图（800px 宽）
        const thumbOut = path.join(thumbDir, name + '.webp');
        await sharp(tmpPng)
            .resize(800, undefined, { withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: 70, effort: 6 })
            .toFile(thumbOut);
        const thumbSize = fs.statSync(thumbOut).size;

        // 清理临时文件
        fs.unlinkSync(tmpPng);

        console.log(`  ✅ ${v.title} → 封面${(optSize/1e3).toFixed(0)}KB / 卡片${(thumbSize/1e3).toFixed(0)}KB`);
    }

    console.log(`\n  📁 封面已生成到 optimized/ 目录`);
}

processAll().catch(e => { console.error(e); process.exit(1); });
