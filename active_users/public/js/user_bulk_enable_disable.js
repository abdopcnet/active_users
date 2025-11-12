frappe.listview_settings["User"] = {
  onload: function (listview) {
    // --- Enable Users ---
    listview.page.add_inner_button(__("Enable"), function () {
      let selected = listview.get_checked_items();
      if (!selected.length) {
        frappe.msgprint(__("Select at least one User."));
        return;
      }

      // Update each selected user on the server. Use frappe.db.set_value to avoid
      // relying on a client-side doc.save() which is not available in list view.
      const promises = selected.map(function (row) {
        return frappe.db.set_value("User", row.name, { enabled: 1 }).then(() => {
          frappe.show_alert({ message: __(row.name + " Enabled"), indicator: "green" });
        });
      });

      // Refresh after all updates complete
      Promise.all(promises).then(() => listview.refresh());
    });

    // --- Disable Users ---
    listview.page.add_inner_button(__("Disable"), function () {
      let selected = listview.get_checked_items();
      if (!selected.length) {
        frappe.msgprint(__("Select at least one User."));
        return;
      }

      // Update each selected user on the server. Use frappe.db.set_value to avoid
      // relying on a client-side doc.save() which is not available in list view.
      const disable_promises = selected.map(function (row) {
        return frappe.db.set_value("User", row.name, { enabled: 0 }).then(() => {
          frappe.show_alert({ message: __(row.name + " Disabled"), indicator: "red" });
        });
      });

      // Refresh after all updates complete
      Promise.all(disable_promises).then(() => listview.refresh());
    });

    // --- Disable All (Except Admin/Guest) ---
    listview.page.add_inner_button(__("Disable All (Except Admin/Guest)"), function () {
      frappe.confirm(__("This will disable all users except Administrator and Guest. Continue?"), function () {
        // Call server method to get all users except administrator and guest
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "User",
            filters: [
              ["name", "not in", ["Administrator", "Guest"]],
              ["enabled", "=", 1],
            ],
            fields: ["name"],
          },
          callback: function (r) {
            if (r.message && r.message.length > 0) {
              const users_to_disable = r.message;
              const disable_all_promises = users_to_disable.map(function (user) {
                return frappe.db.set_value("User", user.name, { enabled: 0 });
              });

              Promise.all(disable_all_promises).then(() => {
                frappe.show_alert({
                  message: __("{0} users disabled", [users_to_disable.length]),
                  indicator: "orange",
                });
                listview.refresh();
              });
            } else {
              frappe.msgprint(__("No users to disable."));
            }
          },
        });
      });
    });
  },
};
