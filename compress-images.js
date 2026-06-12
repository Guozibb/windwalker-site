// 图片压缩脚本 — 将大 PNG/JPG 转为 WebP，大幅减少体积
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGE_FILES = [
    "11b1f0934f6411a6a900968d9eb7e5d1.png",
    "1c7581fd597696e2d22a8be3b841db23.png",
    "3236882f9afea685bfa12ea409e35b42.png",
    "33e3836a5377a5fb7dc090e8e75dbbb6.png",
    "39a32cebd13fe01bef6ea71d0108b201.png",
    "6b88850ec2d131d87ea08fbc3278aaff.png",
    "9bceb61c1feb5ab8835f85a96ecb6a94.png",
    "9bdce1922faf135de9f42f43f6801085.png",
    "aa25c7b82a76e401b9329bb4acad8a03.png",
    "cb5f2b6482f1bda0c2c786cfb14ccb9a.png",
    "de1fdff896e1bb71884769c28b9dfcfb.png",
    "8076e51aa7c29ab6a8a5e44ed45721dc.png",
    "c69a3d92c57f26f51ee39517a782b3e5.png",
    "ee8797bdd9a0b86d56e7f263616dd550.png",
    "face80389bc00e495648859b46b9aa7e.png",
    "2e889ef86bf246d8ab479842400bf294.jpg",
    "7dbbc228f02eac0b0388fc468741d65e.jpg",
    "e6ae0978d10e6c6cf99927a39244c5cc.png",
    "3eeb38378e22d2e2b06d24ebc1a6229a.png",
];

const FULL_WIDTH = 1600;  // 大图最大宽度
const THUMB_WIDTH = 400;  // 缩略图宽度（画廊卡片用）

async function compressAll() {
    const fullDir = path.join(__dirname, 'optimized');
    const thumbDir = path.join(__dirname, 'optimized', 'thumb');
    if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

    let totalBefore = 0, totalAfter = 0;

    for (const file of IMAGE_FILES) {
        const srcPath = path.join(__dirname, file);
        if (!fs.existsSync(srcPath)) {
            console.log(`  ⚠ 跳过（不存在）: ${file}`);
            continue;
        }

        const name = path.parse(file).name;
        const beforeSize = fs.statSync(srcPath).size;
        totalBefore += beforeSize;

        // 生成大图 WebP (1600px)
        const fullOut = path.join(fullDir, name + '.webp');
        await sharp(srcPath)
            .resize(FULL_WIDTH, undefined, { withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: 82 })
            .toFile(fullOut);
        const fullSize = fs.statSync(fullOut).size;

        // 生成缩略图 WebP (400px)
        const thumbOut = path.join(thumbDir, name + '.webp');
        await sharp(srcPath)
            .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: 72 })
            .toFile(thumbOut);
        const thumbSize = fs.statSync(thumbOut).size;

        totalAfter += thumbSize; // 缩略图用于卡片展示
        const pct = Math.round((1 - fullSize / beforeSize) * 100);
        console.log(`  ✅ ${file}  ${(beforeSize/1e6).toFixed(1)}MB → 大图${(fullSize/1e3).toFixed(0)}KB / 缩略图${(thumbSize/1e3).toFixed(0)}KB  (${pct}%)`);
    }

    console.log(`\n  📊 总计: ${(totalBefore/1e6).toFixed(1)}MB → ${(totalAfter/1e6).toFixed(1)}MB (缩略图)`);
    console.log(`  📁 输出: optimized/ 目录`);
    console.log(`\n  ⚡ 下一步: 修改 modelData 中的 file 路径指向 optimized/thumb/ 下的 .webp 文件`);
    console.log(`     灯箱大图使用 optimized/ 下的 .webp 文件`);
}

compressAll().catch(e => { console.error(e); process.exit(1); });
