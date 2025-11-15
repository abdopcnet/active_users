frappe.ui.form.on("User", {
  onload: function (frm) {
    // Add language change button when form loads
    try {
      add_language_change_button(frm);
    } catch (e) {
      console.log("Error adding language button on onload:", e);
    }
  },

  refresh: function (frm) {
    // Add language change button on refresh
    try {
      add_language_change_button(frm);
    } catch (e) {
      console.log("Error adding language button on refresh:", e);
    }
  },
});

function add_language_change_button(frm) {
  if (!frm || !frm.doc) return;

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
}
