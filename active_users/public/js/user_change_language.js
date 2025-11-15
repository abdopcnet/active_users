frappe.ui.form.on("User", {
  refresh(frm) {
    const current_language = frm.doc.language || "en";

    if (current_language === "en") {
      frm.add_custom_button(__("تغيير إلى العربية"), () => {
        frm.reload_doc();
        frm.set_value("language", "ar");
        frm.save();
      });
    } else if (current_language === "ar") {
      frm.add_custom_button(__("Change to English"), () => {
        frm.reload_doc();
        frm.set_value("language", "en");
        frm.save();
      });
    }
  },
});
