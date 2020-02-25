// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.ui.form.on("Web Page", {
	title: function(frm) {
		if (frm.doc.title && !frm.doc.route) {
			frm.set_value('route', frappe.scrub(frm.doc.title, '-'));
		}
	},
	layout: function(frm) {
		if (frm.is_new()) {
			if (frm.doc.insert_code) {
				if (!frm.doc.javascript) {
					frm.set_value('javascript', `frappe.ready(() => {\n\t\n});`);
				}
			}
		}
	},
	insert_code: function(frm) {
		frm.events.layout(frm);
	},
	refresh: function(frm) {
		if (frm.doc.template_path) {
			frm.set_read_only();
		} else {
			frm.events.layout(frm);
		}
		
		frm.trigger('render_buttons');
	},
	published: function (frm) {
		// If current date is before end date,
		// and web page is manually unpublished,
		// set end date to current date.
		if (!frm.doc.published && frm.doc.end_date) {
			var end_date = frappe.datetime.str_to_obj(frappe.datetime.now_datetime());

			// Set date a few seconds in the future to avoid throwing
			// start and end date validation error
			end_date.setSeconds(end_date.getSeconds() + 5)

			frm.set_value("end_date", end_date);
		}
	},

	set_meta_tags(frm) {
		frappe.utils.set_meta_tag(frm.doc.route);
	},
	
	render_buttons: function (frm) {
		frm.page.clear_inner_toolbar();
		if (!frm.is_new()) {
			if (!frm.doc.custom_format) {
				
			}
			else if (frm.doc.custom_format && !frm.doc.raw_printing) {
				frm.set_df_property("html", "reqd", 1);
			}
			
			frm.add_custom_button(__("Edit Format"), function () {
					/* if (!frm.doc.doc_type) {
						frappe.msgprint(__("Please select DocType first"));
						return;
					} */
					frappe.set_route("webpage-format-builder", frm.doc.name);
				});
				
			
			frm.add_custom_button(__('View Website'), () => {
				window.open('/'+frm.doc.route, '_blank');
			});
		}
	},
})
