frappe.ui.form.on("User", {
  refresh: function (frm) {
    // Add language change button
    if (!frm.is_new()) {
      const current_language = frm.doc.language || "en";

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

      // Reset dirty flag after all refresh events complete
      // This fixes the issue where timezone field changes mark form as dirty
      setTimeout(() => {
        if (frm.doc.__islocal !== 1) {
          frm.doc.__unsaved = 0;
          frm.page.clear_indicator();
        }
      }, 100);
    }
  },
});
