/*
 *  Frappe Active Users © 2025
 *  Author:  future_support
 *  Company: Level Up Marketing & Software Development Services
 *  Licence: Please refer to LICENSE file
 *  Version: 2.0.0 - Table View Only (No Avatars)
 *  Build: 20250710-040500
 *  Last Updated: 2025-07-10 04:05:00
 */

// ===== SECTION: Namespaces/Bootstrap =====
frappe.provide('frappe._active_users');
frappe.provide('frappe._active_users.menu');

// ===== SECTION: Menu Helpers =====
frappe._active_users.menu = {
	ensureOverlay: function () {
		var $ov = $('[data-au-overlay="1"]').first();
		if (!$ov.length) {
			$('body').append(
				'<div data-au-overlay="1" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);visibility:hidden;opacity:0;transition:opacity 120ms ease;z-index:1040;"></div>',
			);
			$ov = $('[data-au-overlay="1"]').first();
		}
		return $ov;
	},

	hideAllMenus: function () {
		$('[data-au-users-menu="1"], .active_users_menu').css({
			visibility: 'hidden',
			opacity: '0',
		});
		this.ensureOverlay().css({ visibility: 'hidden', opacity: '0' });
	},

	anchorMenu: function ($trigger, $menu) {
		var rect = $trigger.get(0).getBoundingClientRect();
		$menu.css({
			position: 'fixed',
			top: rect.bottom + 8 + 'px',
			left: Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - 360)) + 'px',
			transform: 'none',
			zIndex: 1050,
			minWidth: '240px',
			maxWidth: '380px',
			maxHeight: '60vh',
			overflow: 'auto',
			background: '#fff',
			border: '1px solid rgba(0,0,0,0.12)',
			borderRadius: '8px',
			boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
			padding: '10px 12px',
			visibility: 'visible',
			opacity: '1',
		});
	},
};

// ===== SECTION: Prevent duplicate initialization =====
if (window.frappe && window.frappe._active_users && window.frappe._active_users._init) {
	try {
		window.frappe._active_users._init.destroy();
	} catch (e) {}
	window.frappe._active_users._init = null;
}

// ===== SECTION: ActiveUsers Main Class =====
class ActiveUsers {
	constructor() {
		if (frappe.desk == null) {
			frappe.throw(__('Active Users plugin can not be used outside Desk.'));
			return;
		}
		this.is_online = frappe.is_online ? frappe.is_online() : false;
		this.on_online = null;
		this.on_offline = null;

		var me = this;
		$(window).on('online', function () {
			me.is_online = true;
			me.on_online && me.on_online.call(me);
			me.on_online = null;
		});
		$(window).on('offline', function () {
			me.is_online = false;
			me.on_offline && me.on_offline.call(me);
			me.on_offline = null;
		});

		this.settings = {};
		this.data = [];
		this.setup();
	}

	destroy() {
		this.clear_sync();
		if (this.$loading) this.$loading.hide();
		if (this.$app) this.$app.remove();
		$(
			"header.navbar .navbar-collapse ul.navbar-nav li[data-au='users-root'], header.navbar .navbar-collapse ul.navbar-nav li[data-au-item='1']",
		).remove();
		this.data = this._on_online = this._on_offline = this._syncing = null;
		this.$app = this.$body = this.$loading = this.$footer = this.$reload = null;
	}

	error(msg, args) {
		if (msg && typeof msg === 'string' && msg.indexOf('permission') !== -1) {
			return;
		}
		var shortMsg = msg && typeof msg === 'string' ? msg.substring(0, 50) : 'error';
		console.log('[active_users_bundle.js] error (' + shortMsg + ')');
		this.destroy();
		frappe.throw(__(msg, args));
	}

	// ===== SECTION: RPC Wrapper (simplified) =====
	request(method, callback) {
		var me = this;
		return new Promise(function (resolve, reject) {
			frappe.call({
				method: 'active_users.api.' + method,
				async: true,
				freeze: false,
				callback: function (res) {
					if (res && $.isPlainObject(res)) res = res.message || res;
					if (!$.isPlainObject(res)) {
						console.log('[active_users_bundle.js] request (invalid_response)');
						me.error('Active Users plugin received invalid response.');
						reject();
						return;
					}
					if (res.error) {
						console.log('[active_users_bundle.js] request (api_error)');
						me.error(res.message);
						reject();
						return;
					}
					let val = callback && callback.call(me, res);
					resolve(val || res);
				},
			});
		});
	}

	setup() {
		if (!this.is_online) {
			this.on_online = this.setup;
			return;
		}
		var me = this;
		this.sync_settings()
			.then(function () {
				if (!me.settings.enabled) {
					me.destroy();
					return;
				}
				me.setup_display();
				me.sync_reload();
			})
			.catch(function () {
				// On permissions error, do nothing
			});
	}

	sync_settings() {
		return this.request('get_settings', function (res) {
			// Hardcoded refresh interval: 10 minutes (600000 ms)
			this.settings = {
				enabled: cint(res.enabled),
				refresh_interval: 600000,
			};
		});
	}

	setup_display() {
		let title = __('Active Users');
		const $existing = $(
			"header.navbar .navbar-collapse ul.navbar-nav li[data-au='users-root'], header.navbar .navbar-collapse ul.navbar-nav li[data-au-item='1']",
		).first();
		if ($existing.length) {
			this.$app = $existing;
		} else {
			let $nav = $('header.navbar .navbar-collapse ul.navbar-nav').first();
			if (!$nav.length) {
				setTimeout(() => this.setup_display(), 300);
				return;
			}
			let reloadIconHTML =
				frappe._active_users.reload && frappe._active_users.reload.createIconHTML
					? frappe._active_users.reload.createIconHTML()
					: '';
			this.$app = $(
				`<li data-au="users-root" data-au-item="1" title="${title}" style="list-style:none; position:relative;">
                ${reloadIconHTML}
                <a data-au-user="1" href="#" onclick="return false;" aria-haspopup="true" aria-expanded="true" data-persist="true" title="${title}" style="display:inline-block;">
                    <span class="fa fa-user fa-lg fa-fw"></span>
                </a>
                <div class="active_users_menu" data-au-users-menu="1" role="menu" style="position:absolute; right:0; top:100%; min-width:260px; background:#fff; border:1px solid rgba(0,0,0,0.15); border-radius:8px; padding:10px 12px; display:block; visibility:hidden;">
                    <div style="width:100%;">
                        <div data-au-users-body="1"></div>
                    </div>
                    <div style="width:100%; margin-top:6px;">
                        <div>
                            <div data-au-users-footer="1" style="padding:4px 6px; color:#2c3e50;"></div>
                        </div>
                    </div>
                </div>
            </li>`,
			);
			$nav.prepend(this.$app.get(0));
		}
		this.$body = this.$app.find('[data-au-users-body="1"]').first();
		this.$loading = this.$body.find('.active-users-list-loading').first().hide();
		this.$footer = this.$app.find('[data-au-users-footer="1"]').first();
		this.$reload = null;

		if (frappe._active_users.reload) {
			frappe._active_users.reload.init(this.$app);
		}
	}

	sync_reload() {
		if (!this.is_online) return;
		this.clear_sync();
		var me = this;
		this.sync_data().then(function () {
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
		if (!this.$body || !this.$body.length) return;
		this._syncing = true;
		if (!this.data) this.data = [];
		if (this.data.length) {
			this.$footer && this.$footer.length && this.$footer.html('');
			this.$body && this.$body.length && this.$body.empty();
		}
		this.$body.find('.active-users-list-loading').remove();

		return this.request('get_users', function (res) {
			if (res && res.error) {
				if (this.$body && this.$body.length) {
					this.$body.html(
						'<div class="text-danger" style="padding: 20px; text-align: center;">خطأ في الخادم</div>',
					);
				}
				return;
			}
			this.data = res && res.users && Array.isArray(res.users) ? res.users : [];
			if (this.$body && this.$body.length) {
				this.update_list();
			}
			this._syncing = null;
		}).catch((err) => {
			var errMsg = err && err.message ? err.message.substring(0, 50) : 'sync_failed';
			console.log('[active_users_bundle.js] sync_data (' + errMsg + ')');
			this.$body.html(
				'<div class="text-danger" style="padding: 20px; text-align: center;">فشل في تحميل البيانات</div>',
			);
		});
	}

	setup_sync() {
		var me = this;
		this.sync_timer = window.setInterval(function () {
			me.sync_data();
		}, this.settings.refresh_interval);
	}

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
			if (!me.data) me.data = [];
			if (!me.$app || !me.$app.length) {
				me.setup_display();
			}
			me.sync_reload();
		});
	}

	update_list() {
		if (!this.$body || !this.$body.length) return;
		this.$body.empty();

		if (!this.data || !this.data.length) {
			this.$body.html(
				'<div class="text-center" style="padding: 30px; color: #666;">لا توجد مستخدمين نشطين</div>',
			);
			this.$footer.html('');
			return;
		}

		let tableHTML = `<div style="border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
                <div style="background: #f5f5f5; padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; display: flex;">
                    <div style="flex: 1; text-align: left; color: #333;">الاسم</div>
                    <div style="flex: 1; text-align: right; color: #333;">آخر نشاط</div>
                </div>`;

		this.data.forEach(function (user, index) {
			let firstName = user.first_name || 'غير محدد';
			let lastActive = user.last_active || 'غير محدد';
			if (lastActive !== 'غير محدد' && typeof lastActive === 'string') {
				try {
					lastActive = frappe.datetime.str_to_user(lastActive);
				} catch (e) {}
			}
			tableHTML += `<div style="display: flex; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; ${
				index % 2 === 0 ? 'background: #fafafa;' : ''
			}">
                    <div style="flex: 1; text-align: left; font-weight: 500; color: #2c3e50;">${firstName}</div>
                    <div style="flex: 1; text-align: right; color: #7f8c8d; font-size: 14px;">${lastActive}</div>
                </div>`;
		});

		tableHTML += '</div>';
		this.$body.html(tableHTML);
		this.$footer.html('');
	}
}

// ===== SECTION: Initialize =====
frappe._active_users.init = function () {
	if (frappe._active_users._init) {
		try {
			frappe._active_users._init.destroy();
		} catch (e) {}
	}
	if (frappe.desk == null) return;
	frappe._active_users._init = new ActiveUsers();
	window.ACTIVE_USERS_V2_LOADED = true;
};

// ===== SECTION: Document Ready =====
$(document).ready(function () {
	frappe._active_users.init();

	// ===== Menu Event Handlers =====
	var menu = frappe._active_users.menu;
	menu.ensureOverlay().on('click', function () {
		menu.hideAllMenus();
	});

	$(document)
		.on('keydown', function (e) {
			if (e.key === 'Escape') menu.hideAllMenus();
		})
		.on('click', function () {
			try {
				menu.hideAllMenus();
			} catch (err) {
				var errMsg = err && err.message ? err.message.substring(0, 50) : 'click_error';
				console.log('[active_users_bundle.js] click (' + errMsg + ')');
			}
		})
		.on('click', '[data-au-users-menu="1"], .active_users_menu', function (ev) {
			ev.stopPropagation();
		})
		.on('click', '[data-au-user="1"]', function (ev) {
			try {
				ev.preventDefault();
				ev.stopPropagation();
				var $dropdown = $(this).closest('[data-au-item="1"]');
				var $menu = $dropdown.find('.active_users_menu, [data-au-users-menu="1"]').first();
				var isVisible = $menu.css('visibility') === 'visible';
				menu.hideAllMenus();
				if (!isVisible) {
					menu.anchorMenu($(this), $menu);
				}
			} catch (err) {
				var errMsg = err && err.message ? err.message.substring(0, 50) : 'click_error';
				console.log('[active_users_bundle.js] click (' + errMsg + ')');
			}
		});
});
