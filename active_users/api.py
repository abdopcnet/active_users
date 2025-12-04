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

# دالة لجلب الإعدادات (قيم ثابتة)
def settings():
    class SettingsObj:
        def __init__(self):
            self.enabled = 1
            self.user = "Administrator"
    return SettingsObj()

# Fetch application settings (hardcoded values)
@frappe.whitelist()
def get_settings():
    try:
        # Check if user is Administrator
        if frappe.session.user != "Administrator":
            return {"enabled": 0}
        
        app = settings()
        result = _dict({
            "enabled": cint(app.enabled)
        })
        return result
    except Exception as e:
        frappe.log_error(f"[api.py] get_settings (error)")
        return {"enabled": 0}

# Fetch active system users from User DocType (last 5 minutes)
@frappe.whitelist()
def get_users():
    """Return each unique first_name with the latest last_active, sorted by last_active desc, only enabled users with non-null last_active."""
    try:
        # Check if user is Administrator
        if frappe.session.user != "Administrator":
            return {"error": 1, "message": _( "You do not have permission to access this resource.")}
        
        if not frappe.has_permission("User", "read"):
            return {"error": 1, "message": _( "You do not have permission to access this resource.")}

        start = f"{nowdate()} 00:00:00"
        end = now()
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
        
        return {"users": users}
    except Exception as e:
        frappe.log_error(f"[api.py] get_users (error)")
        return {"error": 1, "message": _( "Unable to get the list of users.")}


