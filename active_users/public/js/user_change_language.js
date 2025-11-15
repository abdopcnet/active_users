frappe.ui.form.on("User", {
  refresh(frm) {
    const current_language = frm.doc.language || "en";
    const current_user = frappe.session.user;
    const is_own_record = frm.doc.name === current_user;
    const has_write_permission = frm.perm && frm.perm[0] && frm.perm[0].write;

    // Show button if user has write permission OR viewing their own record
    if (!has_write_permission && !is_own_record) {
      return;
    }

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
