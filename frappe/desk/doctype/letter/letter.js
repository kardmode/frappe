// Copyright (c) 2017, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Letter', {
	refresh: function(frm) {
		if (frm.doc.__islocal) {
			frm.set_value("posting_date",frappe.datetime.get_today());
			
		}
		else{
			if(!frm.doc.posting_date)
				frm.set_value("posting_date",frappe.datetime.get_today());
		}
	}
});
