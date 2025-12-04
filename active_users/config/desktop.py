# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to license.txt


import frappe
from frappe import _


def get_data():
    try:
        return [
            {
                "module_name": "Active Users",
                "color": "blue",
                "icon": "octicon octicon-person",
                "type": "module",
                "label": _("Active Users")
            }
        ]
    except Exception as e:
        frappe.log_error(f"[desktop.py] get_data (error)")
        return []