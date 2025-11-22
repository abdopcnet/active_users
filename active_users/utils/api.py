# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to LICENSE file

import frappe
from frappe import _, _dict
from frappe.utils import (
    cint,
    has_common,
    now,
    add_to_date,
    get_datetime,
    now_datetime,
    nowdate
)

# دالة لجلب DocType الإعدادات
_DEF_SETTINGS = "Active Users Settings"
def settings():
    return frappe.get_doc(_DEF_SETTINGS)

# دالة لتسجيل الأخطاء

def log_error(data):
    frappe.log_error(data, "Active Users")

# Fetch application settings without cache
@frappe.whitelist()
def get_settings():
    """Retrieve application settings from Active Users Settings DocType (no cache)."""
    try:
        frappe.log_error("##################### [api.py] get_settings: Starting #####################", "Active Users")
        frappe.log_error(f"[api.py] get_settings: User: {frappe.session.user}", "Active Users")
        app = settings()
        # تحقق من صلاحية المستخدم بناءً على قائمة users في DocType
        allowed_users = [u.user for u in getattr(app, "users", [])]
        frappe.log_error(f"[api.py] get_settings: Allowed users: {allowed_users}", "Active Users")
        if frappe.session.user not in allowed_users and frappe.session.user != "Administrator":
            frappe.log_error(f"[api.py] get_settings: Permission denied for user: {frappe.session.user}", "Active Users")
            return {"error": 1, "message": _( "You do not have permission to access this resource.")}

        result = _dict({
            "enabled": cint(getattr(app, "enabled", 0)),
            "refresh_interval": cint(getattr(app, "refresh_interval", 5))
        })
        frappe.log_error(f"[api.py] get_settings: Result: enabled={result.enabled}, refresh_interval={result.refresh_interval}", "Active Users")
        frappe.log_error("##################### [api.py] get_settings: Completed #####################", "Active Users")
        return result
    except Exception as e:
        frappe.log_error(f"[api.py] get_settings: ERROR - {str(e)}", "Active Users")
        return {"error": 1, "message": _( "An error occurred while fetching settings.")}

# Fetch active system users from User DocType (last 5 minutes)
@frappe.whitelist()
def get_users():
    """Return each unique first_name with the latest last_active, sorted by last_active desc, only enabled users with non-null last_active."""
    try:
        frappe.log_error("##################### [api.py] get_users: Starting #####################", "Active Users API")
        frappe.log_error(f"[api.py] get_users: User: {frappe.session.user}", "Active Users API")
        if not frappe.has_permission("User", "read"):
            frappe.log_error("[api.py] get_users: No permission to read User", "Active Users API")
            return {"error": 1, "message": _( "You do not have permission to access this resource.")}

        start = f"{nowdate()} 00:00:00"
        end = now()
        frappe.log_error(f"[api.py] get_users: Query range: {start} to {end}", "Active Users API")
        users = frappe.db.sql('''
            SELECT first_name, MAX(last_active) as last_active
            FROM `tabUser`
            WHERE enabled=1
                AND last_active IS NOT NULL
                AND last_active BETWEEN %s AND %s
            GROUP BY first_name
            ORDER BY MAX(last_active) DESC
            LIMIT 100
        ''', (start, end), as_dict=True)
        frappe.log_error(f"[api.py] get_users: Found {len(users)} users", "Active Users API")
        frappe.log_error("##################### [api.py] get_users: Completed #####################", "Active Users API")
        return {"users": users}
    except Exception as e:
        frappe.log_error(f"[api.py] get_users: ERROR - {str(e)}", "Active Users API")
        return {"error": 1, "message": _( "Unable to get the list of users.")}

