# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to LICENSE file


from frappe.utils import now
from frappe.utils.user import get_system_managers

from active_users import __version__
from active_users.utils.common import settings


def after_migrate():
    doc = settings()
    doc.latest_version = __version__
    doc.latest_check = now()
    doc.save(ignore_permissions=True)
