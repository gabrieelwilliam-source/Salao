/* Registra a versão instalável sem interceptar chamadas da API externa. */
(() => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js?v=533', { scope: './' });
      registration.update().catch(() => {});
    } catch (error) {
      console.warn('Não foi possível ativar o modo aplicativo.', error);
    }
  });
})();
