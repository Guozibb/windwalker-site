// 视频压缩脚本 — 将原始 MP4 压缩为 web 优化的 720p 低码率版本
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const fs = require('fs');
const path = require('path');

const VIDEOS = [
    { file: "33ea4677255dc34cda1604eb32c008f5_raw.mp4", label: "角色动画预览 01" },
    { file: "b4b52e12fd2c3a3cdc54697412a85b8d_raw.mp4", label: "角色动画预览 02" },
    { file: "ca190fed84a363048cfe469a48f11a05_raw.mp4", label: "场景漫游预览" },
];

const OUT_DIR = path.join(__dirname, 'optimized', 'video');

function compressVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        console.log(`  🎬 压缩: ${path.basename(inputPath)} ...`);
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .size('1280x?')  // 720p 宽度，高度自动
            .fps(24)
            .videoBitrate('800k')
            .audioCodec('aac')
            .audioBitrate('64k')
            .audioChannels(1)
            .outputOptions([
                '-crf', '28',
                '-preset', 'fast',
                '-movflags', '+faststart',  // 流式加载优化
                '-pix_fmt', 'yuv420p',
            ])
            .output(outputPath)
            .on('progress', p => {
                if (p.percent) process.stdout.write(`\r    ${p.percent.toFixed(1)}%`);
            })
            .on('end', () => {
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                const inSize = fs.statSync(inputPath).size;
                const outSize = fs.statSync(outputPath).size;
                const saved = Math.round((1 - outSize / inSize) * 100);
                console.log(`\r  ✅ ${path.basename(outputPath)}  ${(inSize/1e6).toFixed(1)}MB → ${(outSize/1e6).toFixed(2)}MB (${saved}%)  ${elapsed}s`);
                resolve();
            })
            .on('error', reject)
            .run();
    });
}

async function processAll() {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    console.log('🎬 视频压缩开始\n');

    let totalIn = 0, totalOut = 0;
    for (const v of VIDEOS) {
        const srcPath = path.join(__dirname, v.file);
        if (!fs.existsSync(srcPath)) {
            console.log(`  ⚠ 跳过: ${v.file}`);
            continue;
        }
        const outName = v.file.replace('_raw.mp4', '.mp4');
        const outPath = path.join(OUT_DIR, outName);
        await compressVideo(srcPath, outPath);
        totalIn += fs.statSync(srcPath).size;
        totalOut += fs.statSync(outPath).size;
    }

    console.log(`\n📊 总计: ${(totalIn/1e6).toFixed(1)}MB → ${(totalOut/1e6).toFixed(2)}MB (${Math.round((1-totalOut/totalIn)*100)}%)`);
    console.log(`📁 输出: optimized/video/`);
}

processAll().catch(e => { console.error(e); process.exit(1); });
