const CACHE_NAME = "boardgame-winrate-shell-v1";
const APP_SCOPE = self.registration.scope;
const APP_PATH = new URL(APP_SCOPE).pathname;
const APP_ROOT = new URL("./", APP_SCOPE).href;
const APP_INDEX = new URL("index.html", APP_SCOPE).href;
const SHELL_FILES = [
  APP_ROOT,
  APP_INDEX,
  new URL("manifest.webmanifest", APP_SCOPE).href,
  new URL("icons/icon-192.png", APP_SCOPE).href,
  new URL("icons/icon-512.png", APP_SCOPE).href,
  new URL("icons/icon.svg", APP_SCOPE).href
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith("boardgame-winrate-shell-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(APP_PATH)
  ) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  if (request.mode === "navigate") {
    let response;
    try {
      response = await fetch(request);
    } catch {
      const cachedPage = await cache.match(request);
      const appShell = cachedPage || await cache.match(APP_ROOT) || await cache.match(APP_INDEX);
      return appShell || new Response("オフラインでページを開けません。", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
    if (response.ok) {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        console.error("ページをキャッシュできませんでした。", error);
      }
    }
    return response;
  }

  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (response.ok) {
    try {
      await cache.put(request, response.clone());
    } catch (error) {
      console.error("リソースをキャッシュできませんでした。", error);
    }
  }
  return response;
}
