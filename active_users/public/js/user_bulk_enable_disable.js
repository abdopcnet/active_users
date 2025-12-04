frappe.listview_settings['User'] = {
	onload: function (listview) {
		// --- Enable Users ---
		listview.page.add_inner_button(
			__('Enable'),
			function () {
				const selected = listview.get_checked_items();
				if (!selected || !selected.length) {
					frappe.msgprint({
						message: __('Please select at least one User.'),
						indicator: 'orange',
					});
					return;
				}

				// Update each selected user sequentially to avoid deadlocks
				(async function enableUsers() {
					try {
						let successCount = 0;
						let errorCount = 0;

						for (const row of selected) {
							try {
								await frappe.db.set_value('User', row.name, { enabled: 1 });
								successCount++;
								frappe.show_alert({
									message: __('{0} Enabled', [row.name]),
									indicator: 'green',
								});
							} catch (error) {
								errorCount++;
								var errMsg =
									error && error.message
										? error.message.substring(0, 50)
										: 'enable_failed';
								console.log(
									'[user_bulk_enable_disable.js] enableUser (' + errMsg + ')',
								);
								frappe.show_alert({
									message: __('Failed to enable {0}', [row.name]),
									indicator: 'red',
								});
							}
						}

						// Show summary
						if (successCount > 0) {
							frappe.show_alert({
								message: __('{0} user(s) enabled successfully', [successCount]),
								indicator: 'green',
							});
						}
						if (errorCount > 0) {
							frappe.show_alert({
								message: __('Failed to enable {0} user(s)', [errorCount]),
								indicator: 'red',
							});
						}

						listview.refresh();
					} catch (error) {
						var errMsg =
							error && error.message
								? error.message.substring(0, 50)
								: 'enable_all_failed';
						console.log('[user_bulk_enable_disable.js] enableUsers (' + errMsg + ')');
						frappe.show_alert({
							message: __('An error occurred while enabling users'),
							indicator: 'red',
						});
					}
				})();
			},
			null,
			'success',
		);

		// --- Disable Users ---
		listview.page.add_inner_button(
			__('Disable'),
			function () {
				const selected = listview.get_checked_items();
				if (!selected || !selected.length) {
					frappe.msgprint({
						message: __('Please select at least one User.'),
						indicator: 'orange',
					});
					return;
				}

				// Update each selected user sequentially to avoid deadlocks
				(async function disableUsers() {
					try {
						let successCount = 0;
						let errorCount = 0;

						for (const row of selected) {
							// Prevent disabling Administrator and Guest
							if (row.name === 'Administrator' || row.name === 'Guest') {
								frappe.show_alert({
									message: __('Cannot disable {0}', [row.name]),
									indicator: 'orange',
								});
								continue;
							}

							try {
								await frappe.db.set_value('User', row.name, { enabled: 0 });
								successCount++;
								frappe.show_alert({
									message: __('{0} Disabled', [row.name]),
									indicator: 'red',
								});
							} catch (error) {
								errorCount++;
								var errMsg =
									error && error.message
										? error.message.substring(0, 50)
										: 'disable_failed';
								console.log(
									'[user_bulk_enable_disable.js] disableUser (' + errMsg + ')',
								);
								frappe.show_alert({
									message: __('Failed to disable {0}', [row.name]),
									indicator: 'red',
								});
							}
						}

						// Show summary
						if (successCount > 0) {
							frappe.show_alert({
								message: __('{0} user(s) disabled successfully', [successCount]),
								indicator: 'red',
							});
						}
						if (errorCount > 0) {
							frappe.show_alert({
								message: __('Failed to disable {0} user(s)', [errorCount]),
								indicator: 'red',
							});
						}

						listview.refresh();
					} catch (error) {
						var errMsg =
							error && error.message
								? error.message.substring(0, 50)
								: 'disable_all_failed';
						console.log('[user_bulk_enable_disable.js] disableUsers (' + errMsg + ')');
						frappe.show_alert({
							message: __('An error occurred while disabling users'),
							indicator: 'red',
						});
					}
				})();
			},
			null,
			'danger',
		);

		// --- Disable All (Except Admin/Guest) ---
		listview.page.add_inner_button(
			__('Disable All'),
			function () {
				frappe.confirm(
					__('This will disable all users except Administrator and Guest. Continue?'),
					function () {
						// Call server method to get all users except administrator and guest
						frappe.call({
							method: 'frappe.client.get_list',
							args: {
								doctype: 'User',
								filters: [
									['name', 'not in', ['Administrator', 'Guest']],
									['enabled', '=', 1],
								],
								fields: ['name'],
							},
							callback: async function (r) {
								try {
									if (!r.message || !r.message.length) {
										frappe.msgprint({
											message: __('No enabled users to disable.'),
											indicator: 'blue',
										});
										return;
									}

									const users_to_disable = r.message;
									let successCount = 0;
									let errorCount = 0;

									// Show progress
									frappe.show_alert({
										message: __('Disabling {0} users...', [
											users_to_disable.length,
										]),
										indicator: 'blue',
									});

									// Update each user sequentially to avoid deadlocks
									for (const user of users_to_disable) {
										try {
											await frappe.db.set_value('User', user.name, {
												enabled: 0,
											});
											successCount++;
										} catch (error) {
											errorCount++;
											var errMsg =
												error && error.message
													? error.message.substring(0, 50)
													: 'disable_all_failed';
											console.log(
												'[user_bulk_enable_disable.js] disableAll (' +
													errMsg +
													')',
											);
										}
									}

									// Show summary
									if (successCount > 0) {
										frappe.show_alert({
											message: __('{0} user(s) disabled successfully', [
												successCount,
											]),
											indicator: 'orange',
										});
									}
									if (errorCount > 0) {
										frappe.show_alert({
											message: __('Failed to disable {0} user(s)', [
												errorCount,
											]),
											indicator: 'red',
										});
									}

									listview.refresh();
								} catch (error) {
									var errMsg =
										error && error.message
											? error.message.substring(0, 50)
											: 'disable_all_failed';
									console.log(
										'[user_bulk_enable_disable.js] disableAll (' +
											errMsg +
											')',
									);
									frappe.show_alert({
										message: __('An error occurred while disabling users'),
										indicator: 'red',
									});
								}
							},
							error: function (error) {
								var errMsg =
									error && error.message
										? error.message.substring(0, 50)
										: 'fetch_failed';
								console.log(
									'[user_bulk_enable_disable.js] fetchUsers (' + errMsg + ')',
								);
								frappe.show_alert({
									message: __('Failed to fetch users list'),
									indicator: 'red',
								});
							},
						});
					},
				);
			},
			null,
			'warning',
		);
	},
};
