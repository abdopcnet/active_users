# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to license.txt


from frappe import _


def get_data():
    return [
        {
            "module_name": "Active Users",
            "color": "blue",
            "icon": "octicon octicon-person",
            "type": "module",
            "label": _("Active Users")
        }
    ]