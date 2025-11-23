/*
 *  Frappe Active Users © 2025
 *  Author:  future_support
 *  Company: Level Up Marketing & Software Development Services
 *  Licence: Please refer to LICENSE file
 *  Version: 2.0.0 - Table View Only (No Avatars)
 *  Build: 20250710-040500
 *  Last Updated: 2025-07-10 04:05:00
 */

/* alert("active_users loaded!");*/

// ===== SECTION: Namespaces/Bootstrap =====
frappe.provide("frappe._active_users");
frappe.provide("frappe.dom");

// ===== SECTION: Prevent duplicate initialization (destroy old instance if present) =====
// Force clear any old cached versions
if (
  window.frappe &&
  window.frappe._active_users &&
  window.frappe._active_users._init
) {
  try {
    window.frappe._active_users._init.destroy();
  } catch (e) {}
  window.frappe._active_users._init = null;
}

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

class ActiveUsers {
  // ===== SECTION: Constructor =====
  constructor() {
    if (frappe.desk == null) {
      frappe.throw(__("Active Users plugin can not be used outside Desk."));
      return;
    }
    this.is_online = frappe.is_online ? frappe.is_online() : false;
    this.on_online = null;
    this.on_offline = null;

    var me = this;
    $(window).on("online", function () {
      me.is_online = true;
      me.on_online && me.on_online.call(me);
      me.on_online = null;
    });
    $(window).on("offline", function () {
      me.is_online = false;
      me.on_offline && me.on_offline.call(me);
      me.on_offline = null;
    });

    this.settings = {};
    this.data = [];

    this.setup();
  }
  // ===== SECTION: Teardown =====
  destroy() {
    this.clear_sync();
    if (this.$loading) this.$loading.hide();
    if (this.$reload) this.$reload.off("click").hide();
    if (this.$app) this.$app.remove();
    this.data = this._on_online = this._on_offline = this._syncing = null;
    this.$app = this.$body = this.$loading = this.$footer = this.$reload = null;
  }
  error(msg, args) {
    // If the error is permissions-related, ignore silently
    if (msg && typeof msg === "string" && msg.indexOf("permission") !== -1) {
      return;
    }
    this.destroy();
    frappe.throw(__(msg, args));
  }
  // ===== SECTION: RPC Wrapper =====
  request(method, callback, type) {
    var me = this;
    return new Promise(function (resolve, reject) {
      let data = {
        method: "active_users.api." + method,
        async: true,
        freeze: false,
        callback: function (res) {
          if (res && $.isPlainObject(res)) res = res.message || res;
          if (!$.isPlainObject(res)) {
            me.error("Active Users plugin received invalid " + type + ".");
            reject();
            return;
          }
          if (res.error) {
            me.error(res.message);
            reject();
            return;
          }
          let val = callback && callback.call(me, res);
          resolve(val || res);
        },
      };
      try {
        frappe.call(data);
      } catch (e) {
        console.log("[active_users_bundle.js] request:", e.message || e);
        this.error("An error has occurred while sending a request.");
        reject();
      }
    });
  }
  // ===== SECTION: Setup (entry) =====
  setup() {
    // Always render the red reload icon for all users
    this.setup_display();
    if (!this.is_online) {
      this.on_online = this.setup;
      return;
    }
    var me = this;
    this.sync_settings()
      .then(function () {
        // Load data only if user is authorized
        if (!me.settings.enabled) return;
        // Also skip if there was a permissions error
        if (me.settings && me.settings.error) return;
        Promise.resolve().then(function () {
          me.sync_reload();
        });
      })
      .catch(function (error) {
        // On permissions error, do nothing (no UI and no message)
        return;
      });
  }
  // ===== SECTION: Settings sync =====
  sync_settings() {
    return this.request(
      "get_settings",
      function (res) {
        res.enabled = cint(res.enabled);
        res.refresh_interval = cint(res.refresh_interval) * 60000;
        this.settings = res;
      },
      "settings"
    );
  }
  // ===== SECTION: Navbar UI (reload icon, users dropdown) =====
  setup_display() {
    let title = __("Active Users");
    // If the navbar item already exists, reuse it
    const $existing = $(
      "header.navbar .navbar-collapse ul.navbar-nav li[data-au='users-root'], header.navbar .navbar-collapse ul.navbar-nav li[data-au-item='1']"
    ).first();
    if ($existing.length) {
      this.$app = $existing;
    } else {
      // Find a robust navbar target
      let $nav = $("header.navbar .navbar-collapse ul.navbar-nav").first();
      // If navbar not yet in DOM, retry shortly
      if (!$nav.length) {
        setTimeout(() => this.setup_display(), 300);
        return;
      }
      this.$app = $(
        `
            <li data-au="users-root" data-au-item="1" title="${title}" style="list-style:none; position:relative;">
                <span class="reload_icon" data-au-reload="1" title="Reload" style="cursor:pointer;display:inline-block;margin-right:6px;">
                    <span class="fa fa-refresh fa-md fa-fw" style="color:#e74c3c;"></span>
                </span>
                <a data-au-user="1" href="#" onclick="return false;" aria-haspopup="true" aria-expanded="true" data-persist="true" title="${title}" style="display:inline-block;">
                    <span class="fa fa-user fa-lg fa-fw"></span>
                </a>
                <div class="active_users_menu" data-au-users-menu="1" role="menu" style="position:absolute; right:0; top:100%; min-width:260px; background:#fff; border:1px solid rgba(0,0,0,0.15); border-radius:8px; padding:10px 12px; display:block; visibility:hidden;">
                    <div style="width:100%;">
                        <div data-au-users-body="1"></div>
                    </div>
                    <div style="width:100%; margin-top:6px;">
                        <div>
                            <div data-au-users-footer="1" style="padding:4px 6px; color:#2c3e50;">المستخدمين النشطين</div>
                        </div>
                    </div>
                </div>
            </li>
        `
      );
      $nav.prepend(this.$app.get(0));
    }
    this.$body = this.$app.find('[data-au-users-body="1"]').first();
    this.$loading = this.$body
      .find(".active-users-list-loading")
      .first()
      .hide();
    this.$footer = this.$app.find('[data-au-users-footer="1"]').first();
    this.$reload = null;

    // Re-bind click handler on the top red reload icon
    this.$app.find('[data-au-reload="1"]').on("click", () => {
      window.clearCacheAndReload();
    });
  }
  // ===== SECTION: Sync (reload + interval) =====
  sync_reload() {
    if (!this.is_online) return;
    this.clear_sync();
    var me = this;
    Promise.resolve()
      .then(function () {
        me.sync_data();
      })
      .then(function () {
        me.setup_sync();
      });
  }
  clear_sync() {
    if (this.sync_timer) {
      window.clearInterval(this.sync_timer);
      this.sync_timer = null;
    }
  }
  sync_data() {
    this._syncing = true;
    if (this.data.length) {
      this.$footer.html("");
      this.$body.empty();
    }
    // Remove loading animation that might be leftover
    this.$body.find(".active-users-list-loading").remove();

    this.request(
      "get_users",
      function (res) {
        if (res && res.error) {
          this.$body.html(
            '<div class="text-danger" style="padding: 20px; text-align: center;">خطأ في الخادم</div>'
          );
          return;
        }

        this.data =
          res && res.users && Array.isArray(res.users) ? res.users : [];
        this.update_list();
        this._syncing = null;
      },
      "users list"
    ).catch((err) => {
      console.log("[active_users_bundle.js] sync_data:", err.message || err);
      this.$body.html(
        '<div class="text-danger" style="padding: 20px; text-align: center;">فشل في تحميل البيانات</div>'
      );
    });
  }
  // ===== SECTION: Interval setup =====
  setup_sync() {
    var me = this;
    this.sync_timer = window.setInterval(function () {
      me.sync_data();
    }, this.settings.refresh_interval);
  }
  // ===== SECTION: Settings refresh entry =====
  update_settings() {
    if (!this.is_online) {
      this.on_online = this.update_settings;
      return;
    }
    var me = this;
    this.sync_settings().then(function () {
      if (!me.settings.enabled) {
        me.destroy();
        return;
      }
      Promise.resolve().then(function () {
        me.sync_reload();
      });
    });
  }
  // ===== SECTION: Render users list =====
  update_list() {
    // Clear everything completely
    this.$body.empty().html("");

    if (!this.data || !this.data.length) {
      this.$body.html(
        '<div class="text-center" style="padding: 30px; color: #666;">لا توجد مستخدمين نشطين</div>'
      );
      this.$footer.html("");
      return;
    }

    // Build complete table HTML
    let tableHTML = `
            <div style="border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
                <div style="background: #f5f5f5; padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; display: flex;">
                    <div style="flex: 1; text-align: left; color: #333;">الاسم</div>
                    <div style="flex: 1; text-align: right; color: #333;">آخر نشاط</div>
                </div>
        `;

    this.data.forEach(function (user, index) {
      let firstName = user.first_name || "غير محدد";
      let lastActive = user.last_active || "غير محدد";

      // Format date if it's a valid date string
      if (lastActive !== "غير محدد" && typeof lastActive === "string") {
        try {
          lastActive = frappe.datetime.str_to_user(lastActive);
        } catch (e) {
          // Date formatting failed, keep original value
        }
      }

      tableHTML += `
                <div style="display: flex; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; ${
                  index % 2 === 0 ? "background: #fafafa;" : ""
                }">
                    <div style="flex: 1; text-align: left; font-weight: 500; color: #2c3e50;">${firstName}</div>
                    <div style="flex: 1; text-align: right; color: #7f8c8d; font-size: 14px;">${lastActive}</div>
                </div>
            `;
    });

    tableHTML += "</div>";

    this.$body.html(tableHTML);
    this.$footer.html("المستخدمين النشطين");
  }
}

frappe._active_users.init = function () {
  if (frappe._active_users._init) {
    try {
      frappe._active_users._init.destroy();
    } catch (e) {
      // Error destroying old instance
    }
  }

  if (frappe.desk == null) {
    return;
  }

  frappe._active_users._init = new ActiveUsers();

  // Set a flag to indicate the new version is loaded
  window.ACTIVE_USERS_V2_LOADED = true;
};

$(document).ready(function () {
  frappe._active_users.init();

  // ===== Inline modal helpers (centered menus with backdrop) =====
  function ensureOverlay() {
    var $ov = $('[data-au-overlay="1"]').first();
    if (!$ov.length) {
      $("body").append(
        '<div data-au-overlay="1" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);visibility:hidden;opacity:0;transition:opacity 120ms ease;z-index:1040;"></div>'
      );
      $ov = $('[data-au-overlay="1"]').first();
    }
    return $ov;
  }
  function showOverlay() {
    ensureOverlay().css({ visibility: "visible", opacity: "1" });
  }
  function hideOverlay() {
    ensureOverlay().css({ visibility: "hidden", opacity: "0" });
  }
  function centerMenu($menu, widthPx) {
    var w = widthPx || 420;
    // Clear dropdown positioning that may keep it at top/right
    $menu.css({ right: "auto", bottom: "auto" });
    $menu.css({
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 1050,
      minWidth: w + "px",
      maxWidth: "90vw",
      maxHeight: "80vh",
      overflow: "auto",
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: "8px",
      boxShadow: "0 16px 36px rgba(0,0,0,0.22)",
      padding: "14px 16px",
      visibility: "visible",
      opacity: "1",
    });
  }
  function hideMenu($menu) {
    $menu.css({ visibility: "hidden", opacity: "0" });
  }
  function hideAllMenus() {
    hideMenu($('[data-au-users-menu="1"], .active_users_menu'));
    hideOverlay();
  }

  // Initialize overlay once and bind outside click
  ensureOverlay().on("click", function () {
    hideAllMenus();
  });
  $(document).on("keydown", function (e) {
    if (e.key === "Escape") hideAllMenus();
  });

  // Anchor a small dropdown to a trigger (no overlay)
  function anchorMenu($trigger, $menu) {
    var rect = $trigger.get(0).getBoundingClientRect();
    var top = rect.bottom + 8;
    var left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - 360)
    );
    $menu.css({
      position: "fixed",
      top: top + "px",
      left: left + "px",
      transform: "none",
      zIndex: 1050,
      minWidth: "240px",
      maxWidth: "380px",
      maxHeight: "60vh",
      overflow: "auto",
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.12)",
      borderRadius: "8px",
      boxShadow: "0 12px 28px rgba(0,0,0,0.15)",
      padding: "10px 12px",
      visibility: "visible",
      opacity: "1",
    });
  }

  // Close on any outside click (no overlay needed for anchored dropdown)
  $(document).on("click", function () {
    try {
      hideAllMenus();
    } catch (err) {
      try {
        console.log("[active_users_bundle.js] click:", err);
      } catch (_) {}
    }
  });
  // Prevent close when clicking inside the menus
  $(document).on(
    "click",
    '[data-au-users-menu="1"], .active_users_menu',
    function (ev) {
      ev.stopPropagation();
    }
  );

  // ===== Toggle users menu on click =====
  $(document).on("click", '[data-au-user="1"]', function (ev) {
    try {
      ev.preventDefault();
      ev.stopPropagation();
      var $dropdown = $(this).closest('[data-au-item="1"]');
      var $menu = $dropdown
        .find('.active_users_menu, [data-au-users-menu="1"]')
        .first();
      var isVisible = $menu.css("visibility") === "visible";
      hideAllMenus();
      if (!isVisible) {
        anchorMenu($(this), $menu);
        // no overlay for anchored users menu
      }
    } catch (err) {
      try {
        console.log("[active_users_bundle.js] click:", err);
      } catch (_) {}
    }
  });

  // Prevent clicks inside menus from bubbling and closing them
  $(document).on("click", '[data-au-users-menu="1"]', function (ev) {
    ev.stopPropagation();
  });

  // (Removed mouseleave auto-close to avoid premature closing on re-open attempts)
});
