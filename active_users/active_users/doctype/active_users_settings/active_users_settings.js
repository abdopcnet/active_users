/*
*  Active Users © 2025
*  Author:  future_support
*  Company: Level Up Marketing & Software Development Services
*  Licence: Please refer to LICENSE file
*/

frappe.provide('frappe._active_users');

frappe.ui.form.on('Active Users Settings', {
    setup: function(frm) {
        frm._visibility_ready = false;
    },
    after_save: function(frm) {
        if (frappe._active_users._init)
            frappe._active_users._init.update_settings();
    },
});
