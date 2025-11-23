frappe.ui.form.on('User', {
	refresh: function (frm) {
		// Add language change button
		if (frm.is_new()) {
			return;
		}

		try {
			const current_language = frm.doc.language || 'en';

			// Add appropriate language change button
			if (current_language === 'en') {
				frm.add_custom_button(__('تغيير إلى العربية'), function () {
					try {
						frm.set_value('language', 'ar');
						frm.save()
							.then(() => {
								frappe.show_alert({
									message: __('Language changed to Arabic'),
									indicator: 'green',
								});
								// Reload to apply language change
								frappe.set_route('Form', 'User', frm.doc.name);
							})
							.catch((error) => {
								console.log("[user_change_language.js] saveLanguage");
								frappe.show_alert({
									message: __('Failed to change language'),
									indicator: 'red',
								});
							});
					} catch (error) {
						console.log("[user_change_language.js] changeLanguage");
						frappe.show_alert({
							message: __('An error occurred while changing language'),
							indicator: 'red',
						});
					}
				}).addClass('btn-danger');
			} else if (current_language === 'ar') {
				frm.add_custom_button(__('Change to English'), function () {
					try {
						frm.set_value('language', 'en');
						frm.save()
							.then(() => {
								frappe.show_alert({
									message: __('Language changed to English'),
									indicator: 'green',
								});
								// Reload to apply language change
								frappe.set_route('Form', 'User', frm.doc.name);
							})
							.catch((error) => {
								console.log("[user_change_language.js] saveLanguage");
								frappe.show_alert({
									message: __('Failed to change language'),
									indicator: 'red',
								});
							});
					} catch (error) {
						console.log("[user_change_language.js] changeLanguage");
						frappe.show_alert({
							message: __('An error occurred while changing language'),
							indicator: 'red',
						});
					}
				}).addClass('btn-danger');
			}

			// Reset dirty flag after all refresh events complete
			// This fixes the issue where timezone field changes mark form as dirty
			setTimeout(() => {
				try {
					if (frm.doc.__islocal !== 1) {
						frm.doc.__unsaved = 0;
						frm.page.clear_indicator();
					}
				} catch (error) {
					console.log("[user_change_language.js] clearIndicator");
				}
			}, 100);
		} catch (error) {
			console.log("[user_change_language.js] refresh");
		}
	},
});
