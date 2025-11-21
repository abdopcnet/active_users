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
frappe.provide('frappe.dom');

// ===== SECTION: Constants =====
const ACTIVE_USERS_CONSTANTS = {
	API_METHOD_PREFIX: 'active_users.utils.api.',
	SETUP_RETRY_DELAY: 300,
	MIN_REFRESH_INTERVAL: 1,
	MAX_USERS_DISPLAY: 100,
	DATA_ATTRIBUTES: {
		ROOT: 'users-root',
		ITEM: 'au-item',
		RELOAD: 'au-reload',
		USER: 'au-user',
		MENU: 'au-users-menu',
		BODY: 'au-users-body',
		FOOTER: 'au-users-footer',
		OVERLAY: 'au-overlay',
	},
};

// ===== SECTION: Prevent duplicate initialization (destroy old instance if present) =====
// Force clear any old cached versions
if (window.frappe && window.frappe._active_users && window.frappe._active_users._init) {
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
			frappe.throw(__('Active Users plugin can not be used outside Desk.'));
			return;
		}
		this.is_online = frappe.is_online ? frappe.is_online() : false;

		this.settings = {};
		this.data = [];

		this.setup();
	}
	// ===== SECTION: Teardown =====
	destroy() {
		this.clear_sync();
		if (this.$loading) this.$loading.hide();
		if (this.$reload) this.$reload.off('click').hide();
		if (this.$app) this.$app.remove();
		this.data = this._syncing = null;
		this.$app = this.$body = this.$loading = this.$footer = this.$reload = null;
	}
	error(msg, args) {
		// If the error is permissions-related, ignore silently
		if (msg && typeof msg === 'string' && msg.toLowerCase().includes('permission')) {
			if (frappe.debug_mode) {
				console.warn('[Active Users] Permission error:', msg);
			}
			return;
		}
		// Log error for debugging
		if (frappe.debug_mode) {
			console.error('[Active Users] Error:', msg, args);
		}
		this.destroy();
		frappe.throw(__(msg, args));
	}
	// ===== SECTION: RPC Wrapper =====
	request(method, callback, type) {
		const me = this;
		return new Promise(function (resolve, reject) {
			const data = {
				method: ACTIVE_USERS_CONSTANTS.API_METHOD_PREFIX + method,
				async: true,
				freeze: false,
				callback: function (response) {
					try {
						// Handle response format
						let res = response;
						if (res && $.isPlainObject(res)) {
							res = res.message || res;
						}

						// Validate response structure
						if (!$.isPlainObject(res)) {
							const errorMsg = __('Active Users plugin received invalid {0}.', [
								type,
							]);
							me.error(errorMsg);
							reject(new Error(errorMsg));
							return;
						}

						// Check for API errors
						if (res.error) {
							const errorMsg =
								res.message ||
								__('An error occurred while processing the request.');
							me.error(errorMsg);
							reject(new Error(errorMsg));
							return;
						}

						// Execute callback if provided
						const result = callback && callback.call(me, res);
						resolve(result !== undefined ? result : res);
					} catch (e) {
						const errorMsg = __('Error processing response: {0}', [e.message]);
						if (frappe.debug_mode) {
							console.error('[Active Users] Response processing error:', e);
						}
						me.error(errorMsg);
						reject(e);
					}
				},
			};

			try {
				frappe.call(data);
			} catch (e) {
				const errorMsg = __('An error occurred while sending a request.');
				if (frappe.debug_mode) {
					console.error('[Active Users] Request error:', e);
				}
				me.error(errorMsg);
				reject(e);
			}
		});
	}
	// ===== SECTION: Setup (entry) =====
	setup() {
		// Always render the red reload icon for all users
		this.setup_display();
		if (!this.is_online) {
			if (frappe.debug_mode) {
				console.warn('[Active Users] Application is offline');
			}
			return;
		}

		this.sync_settings()
			.then((settings) => {
				// Load data only if user is authorized
				if (!this.settings.enabled) {
					if (frappe.debug_mode) {
						console.log('[Active Users] Feature is disabled');
					}
					return;
				}

				// Skip if there was a permissions error
				if (this.settings && this.settings.error) {
					if (frappe.debug_mode) {
						console.warn('[Active Users] Settings error:', this.settings.error);
					}
					return;
				}

				// Initialize sync
				this.sync_reload();
			})
			.catch((error) => {
				// On permissions error, do nothing (no UI and no message)
				if (frappe.debug_mode) {
					console.error('[Active Users] Setup error:', error);
				}
			});
	}
	// ===== SECTION: Settings sync =====
	sync_settings() {
		return this.request(
			'get_settings',
			(res) => {
				// Validate and normalize settings
				const enabled = cint(res.enabled);
				let refreshInterval = cint(res.refresh_interval);

				// Ensure minimum refresh interval
				if (refreshInterval < ACTIVE_USERS_CONSTANTS.MIN_REFRESH_INTERVAL) {
					refreshInterval = ACTIVE_USERS_CONSTANTS.MIN_REFRESH_INTERVAL;
				}

				// Convert to milliseconds
				refreshInterval = refreshInterval * 60000;

				this.settings = {
					enabled: enabled,
					refresh_interval: refreshInterval,
				};

				if (frappe.debug_mode) {
					console.log('[Active Users] Settings loaded:', this.settings);
				}
			},
			'settings',
		);
	}
	// ===== SECTION: Navbar UI (reload icon, users dropdown) =====
	setup_display() {
		const title = __('Active Users');
		const rootSelector = `li[data-${ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES.ROOT}]`;
		const itemSelector = `li[data-${ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES.ITEM}="1"]`;

		// If the navbar item already exists, reuse it
		const $existing = $(
			`header.navbar .navbar-collapse ul.navbar-nav ${rootSelector}, header.navbar .navbar-collapse ul.navbar-nav ${itemSelector}`,
		).first();
		if ($existing.length) {
			this.$app = $existing;
		} else {
			// Find a robust navbar target
			const $nav = $('header.navbar .navbar-collapse ul.navbar-nav').first();
			// If navbar not yet in DOM, retry shortly
			if (!$nav.length) {
				setTimeout(() => this.setup_display(), ACTIVE_USERS_CONSTANTS.SETUP_RETRY_DELAY);
				return;
			}
			const attrs = ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES;
			this.$app = $(
				`<li data-${attrs.ROOT} data-${
					attrs.ITEM
				}="1" title="${title}" style="list-style:none; position:relative;">
					<span class="reload_icon" data-${attrs.RELOAD}="1" title="${__(
					'Reload',
				)}" style="cursor:pointer;display:inline-block;margin-right:6px;">
						<span class="fa fa-refresh fa-md fa-fw" style="color:#e74c3c;"></span>
					</span>
					<a data-${
						attrs.USER
					}="1" href="#" onclick="return false;" aria-haspopup="true" aria-expanded="true" data-persist="true" title="${title}" style="display:inline-block;">
						<span class="fa fa-user fa-lg fa-fw"></span>
					</a>
					<div class="active_users_menu" data-${
						attrs.MENU
					}="1" role="menu" style="position:absolute; right:0; top:100%; min-width:260px; background:#fff; border:1px solid rgba(0,0,0,0.15); border-radius:8px; padding:10px 12px; display:block; visibility:hidden;">
						<div style="width:100%;">
							<div data-${attrs.BODY}="1"></div>
						</div>
						<div style="width:100%; margin-top:6px;">
							<div>
								<div data-${attrs.FOOTER}="1" style="padding:4px 6px; color:#2c3e50;">${__(
					'المستخدمين النشطين',
				)}</div>
							</div>
						</div>
					</div>
				</li>`,
			);
			$nav.prepend(this.$app.get(0));
		}

		const attrs = ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES;
		this.$body = this.$app.find(`[data-${attrs.BODY}="1"]`).first();
		this.$loading = this.$body.find('.active-users-list-loading').first().hide();
		this.$footer = this.$app.find(`[data-${attrs.FOOTER}="1"]`).first();
		this.$reload = null;

		// Re-bind click handler on the top red reload icon
		this.$app
			.find(`[data-${attrs.RELOAD}="1"]`)
			.off('click')
			.on('click', () => {
				if (window.clearCacheAndReload) {
					window.clearCacheAndReload();
				} else {
					location.reload();
				}
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
		// Prevent concurrent syncs
		if (this._syncing) {
			if (frappe.debug_mode) {
				console.warn('[Active Users] Sync already in progress');
			}
			return;
		}

		this._syncing = true;

		// Clear previous data
		if (this.data && this.data.length) {
			this.$footer.html('');
			this.$body.empty();
		}

		// Remove loading animation that might be leftover
		this.$body.find('.active-users-list-loading').remove();

		this.request(
			'get_users',
			(res) => {
				try {
					// Validate response
					if (res && res.error) {
						const errorMsg = res.message || __('خطأ في الخادم');
						this.$body.html(
							`<div class="text-danger" style="padding: 20px; text-align: center;">${errorMsg}</div>`,
						);
						this._syncing = null;
						return;
					}

					// Process users data
					const users = res && res.users && Array.isArray(res.users) ? res.users : [];

					// Limit display to max users
					this.data = users.slice(0, ACTIVE_USERS_CONSTANTS.MAX_USERS_DISPLAY);

					this.update_list();
					this._syncing = null;

					if (frappe.debug_mode) {
						console.log(`[Active Users] Loaded ${this.data.length} users`);
					}
				} catch (error) {
					if (frappe.debug_mode) {
						console.error('[Active Users] Error processing users data:', error);
					}
					this.$body.html(
						`<div class="text-danger" style="padding: 20px; text-align: center;">${__(
							'فشل في تحميل البيانات',
						)}</div>`,
					);
					this._syncing = null;
				}
			},
			'users list',
		).catch((err) => {
			if (frappe.debug_mode) {
				console.error('[Active Users] Failed to load users:', err);
			}
			this.$body.html(
				`<div class="text-danger" style="padding: 20px; text-align: center;">${__(
					'فشل في تحميل البيانات',
				)}</div>`,
			);
			this._syncing = null;
		});
	}
	// ===== SECTION: Interval setup =====
	setup_sync() {
		// Clear existing timer if any
		this.clear_sync();

		// Validate refresh interval
		const interval =
			this.settings.refresh_interval || ACTIVE_USERS_CONSTANTS.MIN_REFRESH_INTERVAL * 60000;

		this.sync_timer = window.setInterval(() => {
			if (this.is_online) {
				this.sync_data();
			}
		}, interval);

		if (frappe.debug_mode) {
			console.log(`[Active Users] Auto-refresh interval set to ${interval / 60000} minutes`);
		}
	}
	// ===== SECTION: Settings refresh entry =====
	update_settings() {
		if (!this.is_online) {
			if (frappe.debug_mode) {
				console.warn('[Active Users] Cannot update settings while offline');
			}
			return;
		}

		this.sync_settings()
			.then(() => {
				if (!this.settings.enabled) {
					this.destroy();
					return;
				}

				// Reload with new settings
				this.sync_reload();
			})
			.catch((error) => {
				if (frappe.debug_mode) {
					console.error('[Active Users] Failed to update settings:', error);
				}
			});
	}
	// ===== SECTION: Render users list =====
	update_list() {
		// Clear everything completely
		this.$body.empty();

		if (!this.data || !this.data.length) {
			const emptyMsg = __('لا توجد مستخدمين نشطين');
			this.$body.html(
				`<div class="text-center" style="padding: 30px; color: #666;">${emptyMsg}</div>`,
			);
			this.$footer.html('');
			return;
		}

		try {
			// Build complete table HTML
			let tableHTML = `
				<div style="border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
					<div style="background: #f5f5f5; padding: 12px; border-bottom: 1px solid #ddd; font-weight: bold; display: flex;">
						<div style="flex: 1; text-align: left; color: #333;">${__('الاسم')}</div>
						<div style="flex: 1; text-align: right; color: #333;">${__('آخر نشاط')}</div>
					</div>
			`;

			this.data.forEach((user, index) => {
				const firstName = frappe.utils.escape_html(user.first_name || __('غير محدد'));
				let lastActive = user.last_active || __('غير محدد');

				// Format date if it's a valid date string
				if (lastActive !== __('غير محدد') && typeof lastActive === 'string') {
					try {
						lastActive = frappe.datetime.str_to_user(lastActive);
					} catch (e) {
						// Date formatting failed, keep original value
						if (frappe.debug_mode) {
							console.warn('[Active Users] Date formatting failed:', lastActive);
						}
					}
				}

				const rowStyle = index % 2 === 0 ? 'background: #fafafa;' : '';
				tableHTML += `
					<div style="display: flex; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; ${rowStyle}">
						<div style="flex: 1; text-align: left; font-weight: 500; color: #2c3e50;">${firstName}</div>
						<div style="flex: 1; text-align: right; color: #7f8c8d; font-size: 14px;">${lastActive}</div>
					</div>
				`;
			});

			tableHTML += '</div>';

			this.$body.html(tableHTML);
			this.$footer.html(__('المستخدمين النشطين'));
		} catch (error) {
			if (frappe.debug_mode) {
				console.error('[Active Users] Error rendering users list:', error);
			}
			this.$body.html(
				`<div class="text-danger" style="padding: 20px; text-align: center;">${__(
					'خطأ في عرض البيانات',
				)}</div>`,
			);
		}
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
	const overlayAttr = ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES.OVERLAY;
	function ensureOverlay() {
		let $ov = $(`[data-${overlayAttr}="1"]`).first();
		if (!$ov.length) {
			$('body').append(
				`<div data-${overlayAttr}="1" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);visibility:hidden;opacity:0;transition:opacity 120ms ease;z-index:1040;"></div>`,
			);
			$ov = $(`[data-${overlayAttr}="1"]`).first();
		}
		return $ov;
	}
	function showOverlay() {
		ensureOverlay().css({ visibility: 'visible', opacity: '1' });
	}
	function hideOverlay() {
		ensureOverlay().css({ visibility: 'hidden', opacity: '0' });
	}
	function centerMenu($menu, widthPx) {
		var w = widthPx || 420;
		// Clear dropdown positioning that may keep it at top/right
		$menu.css({ right: 'auto', bottom: 'auto' });
		$menu.css({
			position: 'fixed',
			top: '50%',
			left: '50%',
			transform: 'translate(-50%, -50%)',
			zIndex: 1050,
			minWidth: w + 'px',
			maxWidth: '90vw',
			maxHeight: '80vh',
			overflow: 'auto',
			background: '#fff',
			border: '1px solid rgba(0,0,0,0.12)',
			borderRadius: '8px',
			boxShadow: '0 16px 36px rgba(0,0,0,0.22)',
			padding: '14px 16px',
			visibility: 'visible',
			opacity: '1',
		});
	}
	function hideMenu($menu) {
		$menu.css({ visibility: 'hidden', opacity: '0' });
	}
	function hideAllMenus() {
		const menuAttr = ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES.MENU;
		hideMenu($(`[data-${menuAttr}="1"], .active_users_menu`));
		hideOverlay();
	}

	// Initialize overlay once and bind outside click
	ensureOverlay().on('click', function () {
		hideAllMenus();
	});
	$(document).on('keydown', function (e) {
		if (e.key === 'Escape') hideAllMenus();
	});

	// Anchor a small dropdown to a trigger (no overlay)
	function anchorMenu($trigger, $menu) {
		var rect = $trigger.get(0).getBoundingClientRect();
		var top = rect.bottom + 8;
		var left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - 360));
		$menu.css({
			position: 'fixed',
			top: top + 'px',
			left: left + 'px',
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
	}

	// Close on any outside click (no overlay needed for anchored dropdown)
	$(document).on('click', function (ev) {
		try {
			// Don't close if clicking on the trigger or menu
			const attrs = ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES;
			const $target = $(ev.target);
			if (
				$target.closest(`[data-${attrs.USER}="1"]`).length ||
				$target.closest(`[data-${attrs.MENU}="1"]`).length ||
				$target.closest('.active_users_menu').length
			) {
				return;
			}
			hideAllMenus();
		} catch (err) {
			if (frappe.debug_mode) {
				console.error('[Active Users] Error handling document click:', err);
			}
		}
	});

	// Prevent close when clicking inside the menus
	const menuAttr = ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES.MENU;
	$(document).on('click', `[data-${menuAttr}="1"], .active_users_menu`, function (ev) {
		ev.stopPropagation();
	});

	// ===== Toggle users menu on click =====
	const userAttr = ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES.USER;
	const itemAttr = ACTIVE_USERS_CONSTANTS.DATA_ATTRIBUTES.ITEM;
	$(document).on('click', `[data-${userAttr}="1"]`, function (ev) {
		try {
			ev.preventDefault();
			ev.stopPropagation();

			const $trigger = $(this);
			const $dropdown = $trigger.closest(`[data-${itemAttr}="1"]`);
			const $menu = $dropdown.find(`.active_users_menu, [data-${menuAttr}="1"]`).first();

			if (!$menu.length) {
				if (frappe.debug_mode) {
					console.warn('[Active Users] Menu not found');
				}
				return;
			}

			const isVisible = $menu.css('visibility') === 'visible';
			hideAllMenus();

			if (!isVisible) {
				anchorMenu($trigger, $menu);
				// no overlay for anchored users menu
			}
		} catch (err) {
			if (frappe.debug_mode) {
				console.error('[Active Users] Error toggling menu:', err);
			}
		}
	});

	// (Removed mouseleave auto-close to avoid premature closing on re-open attempts)
});
