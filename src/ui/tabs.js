export function initTabs(renderers) {
    function switchTab(tabId) {
      document.querySelectorAll('.tab').forEach((btn) =>
        btn.classList.toggle('active', btn.dataset.tab === tabId)
      );
  
      document.querySelectorAll('.tab-content').forEach((sec) =>
        sec.classList.toggle('active', sec.id === tabId)
      );
  
      renderers[tabId]?.();
    }
  
    document.querySelectorAll('.tab').forEach((btn) => {
      btn.onclick = () => switchTab(btn.dataset.tab);
    });
  
    switchTab('dashboard');
  }
  