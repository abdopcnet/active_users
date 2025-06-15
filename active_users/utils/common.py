# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to LICENSE file


import json
import frappe


_LOGGER = frappe.logger("active_users", file_count=50)


_SETTINGS_ = "Active Users Settings"


def error(msg, throw=True):
    frappe.log_error("Active Users", msg)
    if throw:
        frappe.throw(msg, title="Active Users")


def log_error(data):
    if _LOGGER:
        _LOGGER.error(data)


def settings():
    return frappe.get_doc(_SETTINGS_)


def parse_json(data, default=None):
    if default is None:
        default = data
    
    try:
        return json.loads(data)
    except Exception:
        return default