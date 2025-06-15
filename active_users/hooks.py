# Active Users © 2025
# Author:  future_support
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to LICENSE file
app_name = "active_users"
app_title = "Active Users"
app_publisher = "future_support"
app_description = "active_users"
app_icon = "octicon octicon-person"
app_color = "blue"
app_email = "abdopcnet@gmail.com"
app_license = "MIT"

from active_users.version import __frappe_version_min_15__

app_include_css = "/assets/active_users/css/active_users.bundle.css"
app_include_js = "/assets/active_users/js/active_users.bundle.js"

after_install = "active_users.setup.install.after_install"
after_migrate = "active_users.setup.migrate.after_migrate"
