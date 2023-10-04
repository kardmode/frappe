frappe.pages['user-permissions'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'User Permissions Manager',
		single_column: true
	});
}