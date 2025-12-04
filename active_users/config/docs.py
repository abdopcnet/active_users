# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to license.txt


import frappe

"""
Configuration for docs
"""


def get_context(context):
    try:
        context.brand_html = "Active Users"
    except Exception as e:
        frappe.log_error(f"[docs.py] get_context (error)")
