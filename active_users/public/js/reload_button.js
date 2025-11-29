/*
 *  Frappe Active Users © 2025
 *  Author:  future_support
 *  Company: Level Up Marketing & Software Development Services
 *  Licence: Please refer to LICENSE file
 */

frappe.provide("frappe._active_users.reload");

// ===== SECTION: Global clearCacheAndReload helper =====
// Clear cache and reload function
(function () {
  if (window.clearCacheAndReload) return;
  window.clearCacheAndReload = function () {
    try {
      localStorage.clear();
    } catch (_) {
      try {
        Object.keys(localStorage).forEach((k) => localStorage.removeItem(k));
      } catch (_) {}
    }
    try {
      sessionStorage.clear();
    } catch (_) {}
    try {
      location.reload(true);
    } catch (_) {
      location.reload();
    }
  };
})();

// ===== SECTION: Reload Button =====
frappe._active_users.reload = {
  // Create reload icon HTML
  createIconHTML: function () {
    return `
      <span class="reload_icon" data-au-reload="1" title="Reload" style="cursor:pointer;display:inline-block;margin-right:6px;">
        <span class="fa fa-refresh fa-md fa-fw" style="color:#e74c3c;"></span>
      </span>
    `;
  },

  // Bind click handler to reload icon
  bindClickHandler: function ($container) {
    $container.find('[data-au-reload="1"]').off("click").on("click", function () {
      window.clearCacheAndReload();
    });
  },

  // Initialize reload button in container
  init: function ($container) {
    if (!$container || !$container.length) return;
    this.bindClickHandler($container);
  }
};

