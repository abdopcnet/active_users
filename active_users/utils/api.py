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
    now_datetime
)

from .common import (
    _SETTINGS_,
    settings,
    log_error
)

# Fetch application settings without cache
@frappe.whitelist()
def get_settings():
    """Retrieve application settings without cache."""
    try:
        result = _dict({
            "enabled": 0,
            "refresh_interval": 5,
            "allow_manual_refresh": 0
        })
        app = settings()
        allowed_users = set()
        if hasattr(app, "users") and app.users:
            allowed_users = set([v.user for v in app.users if v.user])

        if frappe.session.user in allowed_users:
            result.enabled = 1
            result.refresh_interval = cint(getattr(app, "refresh_interval", 5))
            result.allow_manual_refresh = 1 if cint(getattr(app, "allow_manual_refresh", 0)) else 0

        return result

    except Exception as exc:
        log_error(exc)
        return {"error": 1, "message": _( "An error occurred while fetching settings.")}

# Fetch active users based on system settings
@frappe.whitelist()
def get_users():
    """Retrieve active users list from the last 5 minutes."""
    try:
        if not frappe.has_permission("User", "read"):
            return {"error": 1, "message": _( "You do not have permission to access this resource.")}

        app = settings()
        allowed_users = set()
        if hasattr(app, "users") and app.users:
            allowed_users = set([v.user for v in app.users if v.user])
        # frappe.log_error(f"session.user: {frappe.session.user}", "active_users.get_users")
        if frappe.session.user not in allowed_users:
            return {"users": []}

        now_dt = now()
        start = add_to_date(now_dt, minutes=-5, as_string=True, as_datetime=True)

        data = frappe.get_all(
            "User",
            fields=["name", "full_name", "user_image"],
            filters={
                "enabled": 1,
                "name": ["!=", frappe.session.user],
                "user_type": "System User",
                "last_active": [">=", start],
            },
            order_by="full_name asc",
            limit_page_length=50,
        )

        return {"users": data}

    except Exception as exc:
        log_error(exc)
        return {"error": 1, "message": _( "Unable to get the list of active users.")}


