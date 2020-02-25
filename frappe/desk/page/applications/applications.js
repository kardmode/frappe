frappe.pages['applications'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'App Installer',
		single_column: true
	});
}