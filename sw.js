// Service Worker — 缓存静态资源，加速重复访问
const CACHE_NAME = 'windwalker-v3';
const STATIC_ASSETS = [
    '/windwalker-site/',
    '/windwalker-site/index.html',
    '/windwalker-site/login.html',
];

// 安装时预缓存核心页面
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
    );
    self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// 缓存策略：静态资源 Cache-First，API 请求 Network-First
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 跳过非 HTTP(S) 请求
    if (!url.protocol.startsWith('http')) return;

    // 跳过 Supabase API 请求（始终走网络）
    if (url.hostname.includes('supabase.co')) return;

    // 图片 & 视频 & WebP — Cache First（一次缓存，长期复用）
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm)$/i) ||
        url.pathname.includes('/optimized/')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // JS/CSS — Cache First
    if (url.pathname.match(/\.(js|css)$/i) || url.hostname === 'cdn.jsdelivr.net') {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // HTML 页面 — Network First（确保访问最新内容）
    if (event.request.mode === 'navigate' ||
        url.pathname.match(/\.(html)$/i)) {
        event.respondWith(networkFirst(event.request));
        return;
    }
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        return cached || new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        const cached = await caches.match(request);
        return cached || new Response('Offline', { status: 503 });
    }
}
