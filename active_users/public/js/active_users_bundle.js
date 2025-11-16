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
        method: "active_users.utils.api." + method,
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
      .catch(function () {
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
  // ===== SECTION: Navbar UI (reload icon, ping indicator, users dropdown) =====
  setup_display() {
    let title = __("Active Users");
    // If the navbar item already exists, reuse it and ensure ping indicator exists
    const $existing = $(
      "header.navbar > .container > .navbar-collapse > ul.navbar-nav .active-users-navbar-item"
    ).first();
    if ($existing.length) {
      this.$app = $existing;
      if (!this.$app.find(".active-users-navbar-ping").length) {
        const pingHtml = `
                <span class="nav-link active-users-navbar-ping" style="cursor:default;display:inline-block;margin-right:6px;" title="Response (ms)">
                    <span class="fa fa-bolt fa-md fa-fw" style="color:#4caf50;"></span>
                    <span class="active-users-ping-text" style="font-weight:600;color:#4caf50;">000 ms</span>
                </span>
        `;
        const $reload = this.$app.find(".active-users-navbar-reload").first();
        if ($reload.length) {
          $reload.after(pingHtml);
        } else {
          this.$app.prepend(pingHtml);
        }
      }
    } else {
      this.$app = $(
        `
            <li class="nav-item dropdown dropdown-notifications dropdown-mobile active-users-navbar-item" title="${title}">
                <span class="nav-link active-users-navbar-reload text-danger" style="cursor:pointer;display:inline-block;margin-right:6px;" title="Reload">
                    <span class="fa fa-refresh fa-md fa-fw" style="color:#e74c3c;"></span>
                </span>
                <span class="nav-link active-users-navbar-ping" style="cursor:default;display:inline-block;margin-right:6px;" title="Response (ms)">
                    <span class="fa fa-bolt fa-md fa-fw" style="color:#4caf50;"></span>
                    <span class="active-users-ping-text" style="font-weight:600;color:#4caf50;">000 ms</span>
                </span>
                <a class="nav-link active-users-navbar-icon text-muted"
                    data-toggle="dropdown" aria-haspopup="true" aria-expanded="true" data-persist="true"
                    href="#" onclick="return false;" style="display:inline-block;">
                    <span class="fa fa-user fa-lg fa-fw"></span>
                </a>
                <div class="dropdown-menu active-users-list" role="menu">
                    <div class="fluid-container">
                        <div class="active-users-list-body"></div>
                    </div>
                    <div class="row">
                        <div class="col active-users-list-footer">
                            <div class="row">
                                <div class="col active-users-footer-text">المستخدمين النشطين</div>
                            </div>
                        </div>
                    </div>
                </div>
            </li>
        `
      );
      $(
        "header.navbar > .container > .navbar-collapse > ul.navbar-nav"
      ).prepend(this.$app.get(0));
    }
    this.$body = this.$app.find(".active-users-list-body").first();
    this.$loading = this.$body
      .find(".active-users-list-loading")
      .first()
      .hide();
    this.$footer = this.$app.find(".active-users-footer-text").first();
    this.$reload = null;

    // Re-bind click handler on the top red reload icon
    this.$app.find(".active-users-navbar-reload").on("click", () => {
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
    if (!window.ACTIVE_USERS_V2_LOADED) {
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
      return;
    }

    var me = this;

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

  // Open the dropdown on mouse hover over the users icon
  $(document).on("mouseenter", ".active-users-navbar-icon", function () {
    var $dropdown = $(this).closest(".dropdown");
    if (!$dropdown.hasClass("show")) {
      $dropdown.addClass("show");
      $dropdown.find(".dropdown-menu").addClass("show");
    }
  });
  $(document).on("mouseleave", ".active-users-navbar-item", function () {
    var $dropdown = $(this);
    if ($dropdown.hasClass("show")) {
      $dropdown.removeClass("show");
      $dropdown.find(".dropdown-menu").removeClass("show");
    }
  });
});

// ===== SECTION: Minimal Ping Monitor (standalone) =====
(function () {
  let soundEnabled = false;
  let errorSound = null;
  let wasConnectionLost = false;
  let pingTimer = null;

  function ensurePingElement() {
    const $item = $(
      "header.navbar > .container > .navbar-collapse > ul.navbar-nav .active-users-navbar-item"
    ).first();
    if (!$item.length) return null;
    if (!$item.find(".active-users-navbar-ping").length) {
      const html = `
            <span class="nav-link active-users-navbar-ping" style="cursor:default;display:inline-block;margin-right:6px;" title="Response (ms)">
                <span class="fa fa-bolt fa-md fa-fw" style="color:#4caf50;"></span>
                <span class="active-users-ping-text" style="font-weight:600;color:#4caf50;">000 ms</span>
            </span>
      `;
      const $reload = $item.find(".active-users-navbar-reload").first();
      if ($reload.length) $reload.after(html);
      else $item.prepend(html);
    }
    return $item;
  }

  function updatePingUI(ms) {
    const $item = ensurePingElement();
    if (!$item) return;
    const $text = $item.find(".active-users-ping-text").first();
    const $icon = $item.find(".active-users-navbar-ping .fa-bolt").first();
    const val = ("" + ms).padStart(3, "0");
    let color = "#4caf50";
    const n = parseInt(val, 10);
    if (n < 100) color = "#4caf50";
    else if (n < 300) color = "#1976d2";
    else if (n < 500) color = "#ff9800";
    else color = "#f44336";
    if ($text.length) {
      $text.text(val + " ms").css("color", color);
    }
    if ($icon.length) {
      $icon.css("color", color);
    }
  }

  function enableSoundOnce() {
    if (soundEnabled) return;
    try {
      const url =
        frappe.urllib.get_base_url() + "/assets/active_users/sounds/error.mp3";
      errorSound = new Audio(url);
      errorSound.preload = "auto";
      errorSound
        .play()
        .then(() => {
          errorSound.pause();
          errorSound.currentTime = 0;
          soundEnabled = true;
        })
        .catch(function () {});
    } catch (e) {}
  }

  function playError() {
    if (!soundEnabled) {
      enableSoundOnce();
      setTimeout(playError, 100);
      return;
    }
    try {
      if (errorSound) {
        errorSound.currentTime = 0;
        errorSound.play().catch(function () {});
      }
    } catch (e) {}
  }

  async function measurePingOnce() {
    const start = performance.now();
    let responded = false;
    let timeoutTriggered = false;
    const timeoutId = setTimeout(function () {
      if (!responded) {
        timeoutTriggered = true;
        updatePingUI(999);
        playError();
        wasConnectionLost = true;
      }
    }, 5000);
    try {
      await frappe.call({
        method: "frappe.ping",
        args: {},
        callback: function () {
          if (!timeoutTriggered) {
            responded = true;
            clearTimeout(timeoutId);
            const end = performance.now();
            const ms = Math.round(end - start);
            updatePingUI(ms);
            if (wasConnectionLost) {
              wasConnectionLost = false;
              if (window.clearCacheAndReload) window.clearCacheAndReload();
              else location.reload();
            }
          }
        },
        error: function () {
          if (!timeoutTriggered) {
            responded = true;
            clearTimeout(timeoutId);
            updatePingUI(999);
            wasConnectionLost = true;
          }
        },
        freeze: false,
        show_spinner: false,
        async: true,
      });
    } catch (e) {
      if (!timeoutTriggered) {
        updatePingUI(999);
        playError();
        wasConnectionLost = true;
      }
    }
  }

  function start() {
    ensurePingElement();
    if (pingTimer) return;
    measurePingOnce();
    pingTimer = setInterval(measurePingOnce, 5000);
  }

  // Enable sound on first interaction
  const _once = function () {
    enableSoundOnce();
    document.removeEventListener("click", _once);
    document.removeEventListener("touchstart", _once);
  };
  document.addEventListener("click", _once, { once: true });
  document.addEventListener("touchstart", _once, { once: true });

  // Start when document ready and Active Users init is done
  $(document).ready(function () {
    setTimeout(start, 0);
  });
})();
