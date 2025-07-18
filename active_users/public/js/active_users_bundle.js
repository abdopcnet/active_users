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

frappe.provide('frappe._active_users');
frappe.provide('frappe.dom');

// Force clear any old cached versions
if (window.frappe && window.frappe._active_users && window.frappe._active_users._init) {
    try {
        window.frappe._active_users._init.destroy();
    } catch (e) {
    }
    window.frappe._active_users._init = null;
}


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
        $(window).on('online', function() {
            me.is_online = true;
            me.on_online && me.on_online.call(me);
            me.on_online = null;
        });
        $(window).on('offline', function() {
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
        if (this.$reload) this.$reload.off('click').hide();
        if (this.$app) this.$app.remove();
        this.data = this._on_online = this._on_offline = this._syncing = null;
        this.$app = this.$body = this.$loading = this.$footer = this.$reload = null;
    }
    error(msg, args) {
        // إذا كان الخطأ متعلق بالصلاحية، تجاهله بصمت
        if (msg && typeof msg === 'string' && msg.indexOf('permission') !== -1) {
            return;
        }
        this.destroy();
        frappe.throw(__(msg, args));
    }
    request(method, callback, type) {
        var me = this;
        return new Promise(function(resolve, reject) {
            let data = {
                method: 'active_users.utils.api.' + method,
                'async': true,
                freeze: false,
                callback: function(res) {
                    if (res && $.isPlainObject(res)) res = res.message || res;
                    if (!$.isPlainObject(res)) {
                        me.error('Active Users plugin received invalid ' + type + '.');
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
                }
            };
            try {
                frappe.call(data);
            } catch(e) {
                this.error('An error has occurred while sending a request.');
                reject();
            }
        });
    }
    setup() {
        // إظهار الأيقونة الحمراء دائماً للجميع
        this.setup_display();
        if (!this.is_online) {
            this.on_online = this.setup;
            return;
        }
        var me = this;
        this.sync_settings()
        .then(function() {
            // فقط إذا كان المستخدم مصرح له يتم تحميل البيانات
            if (!me.settings.enabled) return;
            // فقط إذا لم يكن هناك خطأ في الصلاحية
            if (me.settings && me.settings.error) return;
            Promise.resolve()
                .then(function() { me.sync_reload(); });
        })
        .catch(function() {
            // إذا كان هناك خطأ في الصلاحية، لا تفعل شيئاً (لا تظهر القائمة ولا رسالة)
            return;
        });
    }
    sync_settings() {
        return this.request(
            'get_settings',
            function(res) {
                res.enabled = cint(res.enabled);
                res.refresh_interval = cint(res.refresh_interval) * 60000;
                this.settings = res;
            },
            'settings'
        );
    }
    setup_display() {
        let title = __('Active Users');
        // إذا كانت الأيقونة موجودة مسبقاً لا تضفها مرة أخرى
        if ($('header.navbar > .container > .navbar-collapse > ul.navbar-nav .active-users-navbar-item').length) return;
        this.$app = $(
            `
            <li class="nav-item dropdown dropdown-notifications dropdown-mobile active-users-navbar-item" title="${title}">
                <span class="nav-link active-users-navbar-reload text-danger" style="cursor:pointer;display:inline-block;margin-right:6px;" title="Reload">
                    <span class="fa fa-refresh fa-md fa-fw" style="color:#e74c3c;"></span>
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
        $('header.navbar > .container > .navbar-collapse > ul.navbar-nav').prepend(this.$app.get(0));
        this.$body = this.$app.find('.active-users-list-body').first();
        this.$loading = this.$body.find('.active-users-list-loading').first().hide();
        this.$footer = this.$app.find('.active-users-footer-text').first();
        this.$reload = null;

        // إعادة تفعيل حدث التحديث عند المرور على أيقونة الريلود الحمراء في الأعلى
        this.$app.find('.active-users-navbar-reload').on('mouseenter', () => {
            // دائماً نفذ clear_cache
            frappe.ui.toolbar.clear_cache();
            // إذا كان المستخدم مصرح له فقط، نفذ sync_reload
            if (this.settings && this.settings.enabled) {
                this.sync_reload();
            }
        });
    }
    sync_reload() {
        if (!this.is_online) return;
        this.clear_sync();
        var me = this;
        Promise.resolve()
            .then(function() { me.sync_data(); })
            .then(function() { me.setup_sync(); });
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
            this.$footer.html('');
            this.$body.empty();
        }
        // Remove loading animation that might be leftover
        this.$body.find('.active-users-list-loading').remove();
        
        this.request(
            'get_users',
            function(res) {
                if (res && res.error) {
                    this.$body.html('<div class="text-danger" style="padding: 20px; text-align: center;">خطأ في الخادم</div>');
                    return;
                }
                
                this.data = res && res.users && Array.isArray(res.users) ? res.users : [];
                this.update_list();
                this._syncing = null;
            },
            'users list'
        ).catch((err) => {
            this.$body.html('<div class="text-danger" style="padding: 20px; text-align: center;">فشل في تحميل البيانات</div>');
        });
    }
    setup_sync() {
        var me = this;
        this.sync_timer = window.setInterval(function() {
            me.sync_data();
        }, this.settings.refresh_interval);
    }
    update_settings() {
        if (!this.is_online) {
            this.on_online = this.update_settings;
            return;
        }
        var me = this;
        this.sync_settings()
        .then(function() {
            if (!me.settings.enabled) {
                me.destroy();
                return;
            }
            Promise.resolve()
                .then(function() { me.sync_reload(); });
        });
    }
    update_list() {
        if (!window.ACTIVE_USERS_V2_LOADED) {
            setTimeout(() => {
                window.location.reload(true);
            }, 1000);
            return;
        }
        
        var me = this;
        
        // Clear everything completely
        this.$body.empty().html('');
        
        if (!this.data || !this.data.length) {
            this.$body.html('<div class="text-center" style="padding: 30px; color: #666;">لا توجد مستخدمين نشطين</div>');
            this.$footer.html('');
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
        
        this.data.forEach(function(user, index) {
            let firstName = user.first_name || 'غير محدد';
            let lastActive = user.last_active || 'غير محدد';
            
            // Format date if it's a valid date string
            if (lastActive !== 'غير محدد' && typeof lastActive === 'string') {
                try {
                    lastActive = frappe.datetime.str_to_user(lastActive);
                } catch (e) {
                    // Date formatting failed, keep original value
                }
            }
            
            tableHTML += `
                <div style="display: flex; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; ${index % 2 === 0 ? 'background: #fafafa;' : ''}">
                    <div style="flex: 1; text-align: left; font-weight: 500; color: #2c3e50;">${firstName}</div>
                    <div style="flex: 1; text-align: right; color: #7f8c8d; font-size: 14px;">${lastActive}</div>
                </div>
            `;
        });
        
        tableHTML += '</div>';
        
        this.$body.html(tableHTML);
        this.$footer.html('المستخدمين النشطين');
    }
}

frappe._active_users.init = function() {
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

$(document).ready(function() {
    frappe._active_users.init();

    // إضافة فتح القائمة عند المرور بالماوس على الأيقونة
    $(document).on('mouseenter', '.active-users-navbar-icon', function() {
        var $dropdown = $(this).closest('.dropdown');
        if (!$dropdown.hasClass('show')) {
            $dropdown.addClass('show');
            $dropdown.find('.dropdown-menu').addClass('show');
        }
    });
    $(document).on('mouseleave', '.active-users-navbar-item', function() {
        var $dropdown = $(this);
        if ($dropdown.hasClass('show')) {
            $dropdown.removeClass('show');
            $dropdown.find('.dropdown-menu').removeClass('show');
        }
    });
});