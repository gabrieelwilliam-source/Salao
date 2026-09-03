// Safe replacement for previously installed V2.1.4 worker. No navigation loop.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.registration.unregister()));
