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


doctype_js = {"User" : "/public/js/user.js"}


app_include_css = "assets/active_users/css/active_users_bundle.css"
app_include_js = "assets/active_users/js/active_users_bundle.js"

fixtures = [
    {"doctype": "Client Script", "filters": [["module", "=", "Active Users"]]}
]