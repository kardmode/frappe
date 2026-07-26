// Copyright (c) 2016, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on("Bulk Update", {
	refresh: function (frm) {
		frm.set_query("document_type", function () {
			return {
				filters: [
					["DocType", "issingle", "=", 0],
					["DocType", "name", "not in", frappe.model.core_doctypes_list],
				],
			};
		});
		frm.trigger("set_field_options");
		frm.page.set_primary_action(__("Update"), function () {
			if (!frm.doc.only_list && (frm.doc.update_value === undefined || frm.doc.update_value === null || frm.doc.update_value === "")) {
				frappe.throw(__('Field "value" is mandatory. Please specify value to be updated'));
			} else {
				frm.call("bulk_update").then((r) => {
					let res = r.message;
					if (!res) res = [[], []];

					let failed = res[0] || [];
					let docnames = res[1] || [];

					if (frm.doc.only_list) {
						frappe.msgprint({
							title: __("Affected Documents ({0})", [docnames.length]),
							message: docnames.join(", "),
							indicator: "blue",
						});
						frappe.hide_progress();
						return;
					}

					let successful = docnames.filter(d => !failed.includes(d));

					if (failed.length && !r._server_messages) {
						let msg = __("Cannot update {0}", [
							failed.map((f) => (f.bold ? f.bold() : f)).join(", "),
						]);
						if (successful.length) {
							msg += "<br><br>" + __("Successfully updated {0}", [
								successful.map((s) => (s.bold ? s.bold() : s)).join(", "),
							]);
						}
						msg += "<br><br>" + __("Please check the Error Log in the desk for detailed tracebacks.");
						frappe.throw(msg);
					} else {
						let msg = __("Updated Successfully");
						if (successful.length) {
							msg = __("Successfully updated: {0}", [successful.join(", ")]);
						}
						frappe.msgprint({
							title: __("Success"),
							message: msg,
							indicator: "green",
							alert: true,
						});
					}

					frappe.hide_progress();
					frm.save();
				});
			}
		});
	},

	document_type: function (frm) {
		frm.trigger("set_field_options");
	},
	set_field_options(frm) {
		// set field options
		if (!frm.doc.document_type) return;

		frappe.model.with_doctype(frm.doc.document_type, function () {
			var options = $.map(frappe.get_meta(frm.doc.document_type).fields, function (d) {
				if (d.fieldname && frappe.model.no_value_type.indexOf(d.fieldtype) === -1) {
					return d.fieldname;
				}
				return null;
			});
			frm.set_df_property("field", "options", options);
		});
	},
});
