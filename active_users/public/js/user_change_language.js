frappe.ui.form.on("User", {
  refresh: function (frm) {
    // Add language change button without marking form as dirty
    if (!frm.is_new()) {
      const current_language = frm.doc.language || "en";

      // Save the current dirty state
      const was_dirty = frm.is_dirty();

      if (current_language === "en") {
        frm.add_custom_button(__("تغيير إلى العربية"), function () {
          frm.set_value("language", "ar");
          frm.save();
        });
      } else if (current_language === "ar") {
        frm.add_custom_button(__("Change to English"), function () {
          frm.set_value("language", "en");
          frm.save();
        });
      }

      // Restore the dirty state - if it wasn't dirty before, reset it
      if (!was_dirty) {
        frm.doc.__unsaved = 0;
        frm.dirty();
      }
    }
  },
});
