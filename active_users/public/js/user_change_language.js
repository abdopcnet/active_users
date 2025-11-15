frappe.ui.form.on("User", {
  refresh(frm) {
    // إذا اللغة الحالية إنجليزية، أظهر زر لتغييرها إلى العربية
    if (frm.doc.language === "en") {
      frm.add_custom_button(__("English"), () => {
        frm.reload_doc().then(() => {
          frm.set_value("language", "ar");
          frm.save();
        });
      });
    }

    // إذا اللغة الحالية عربية، أظهر زر لتغييرها إلى الإنجليزية
    else if (frm.doc.language === "ar") {
      frm.add_custom_button(__("العربية"), () => {
        frm.reload_doc().then(() => {
          frm.set_value("language", "en");
          frm.save();
        });
      });
    }
  },
});
