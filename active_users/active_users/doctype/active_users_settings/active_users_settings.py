# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to LICENSE file

import frappe
from frappe.model.document import Document

class ActiveUsersSettings(Document):
    def before_save(self):
        # Set default values if not set
        if not self.user:
            self.user = "Administrator"
        if self.refresh_interval is None or self.refresh_interval == 0:
            self.refresh_interval = 5