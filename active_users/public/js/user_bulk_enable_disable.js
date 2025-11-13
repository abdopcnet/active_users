frappe.listview_settings["User"] = {
  onload: function (listview) {
    // --- Enable Users ---
    listview.page.add_inner_button(__("Enable"), function () {
      let selected = listview.get_checked_items();
      if (!selected.length) {
        frappe.msgprint(__("Select at least one User."));
        return;
      }

      // Update each selected user sequentially to avoid deadlocks
      async function enableUsers() {
        for (const row of selected) {
          await frappe.db.set_value("User", row.name, { enabled: 1 }).then(() => {
            frappe.show_alert({ message: __(row.name + " Enabled"), indicator: "green" });
          });
        }
        listview.refresh();
      }
      enableUsers();
    });

    // --- Disable Users ---
    listview.page.add_inner_button(__("Disable"), function () {
      let selected = listview.get_checked_items();
      if (!selected.length) {
        frappe.msgprint(__("Select at least one User."));
        return;
      }

      // Update each selected user sequentially to avoid deadlocks
      async function disableUsers() {
        for (const row of selected) {
          await frappe.db.set_value("User", row.name, { enabled: 0 }).then(() => {
            frappe.show_alert({ message: __(row.name + " Disabled"), indicator: "red" });
          });
        }
        listview.refresh();
      }
      disableUsers();
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
          callback: async function (r) {
            if (r.message && r.message.length > 0) {
              const users_to_disable = r.message;

              // Update each user sequentially to avoid deadlocks
              for (const user of users_to_disable) {
                await frappe.db.set_value("User", user.name, { enabled: 0 });
              }

              frappe.show_alert({
                message: __("{0} users disabled", [users_to_disable.length]),
                indicator: "orange",
              });
              listview.refresh();
            } else {
              frappe.msgprint(__("No users to disable."));
            }
          },
        });
      });
    });
  },
};
