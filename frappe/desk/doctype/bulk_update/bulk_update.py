# Copyright (c) 2015, Frappe Technologies and contributors
# License: MIT. See LICENSE

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


class BulkUpdate(Document):
	@frappe.whitelist()
	def bulk_update(self):
		self.check_permission("write")
		limit = self.limit if self.limit and cint(self.limit) < 500 else 500

		condition = ""
		if self.condition:
			if ";" in self.condition:
				frappe.throw(_("; not allowed in condition"))

			condition = f" where {self.condition}"

		docnames = frappe.db.sql_list(
			f"""select name from `tab{self.document_type}`{condition} limit {limit} offset 0"""
		)
		
		if self.only_list or self.field==None:
			return [[],docnames]
		
		if self.sql_update:
			frappe.db.sql(
				f"""UPDATE `tab{self.document_type}` SET {self.field} = {self.update_value}{condition} limit {limit}"""
			)
			return [[],docnames]
			
		
		return submit_cancel_or_update_docs(
			self.document_type, docnames, "update", {self.field: self.update_value}, self.ignore_validate_update_after_submit
		)


@frappe.whitelist()
def submit_cancel_or_update_docs(doctype, docnames, action="submit", data=None, ignore_validate_update_after_submit=None):
	docnames = frappe.parse_json(docnames)

	if data:
		data = frappe.parse_json(data)

	failed = []

	for i, d in enumerate(docnames, 1):
		doc = frappe.get_doc(doctype, d)
		try:
			message = ""
			if action == "submit" and doc.docstatus.is_draft():
				doc.submit()
				message = _("Submitting {0}").format(doctype)
			elif action == "cancel" and doc.docstatus.is_submitted():
				doc.cancel()
				message = _("Cancelling {0}").format(doctype)
			elif action == "update" and not doc.docstatus.is_cancelled():
				doc.update(data)
				if ignore_validate_update_after_submit:
					doc.flags.ignore_validate_update_after_submit = True
				
				doc.save()
				message = _("Updating {0}").format(doctype)
			else:
				failed.append(d)
			frappe.db.commit()
			show_progress(docnames, message, i, d)

		except Exception:
			failed.append(d)
			frappe.db.rollback()

	return failed


def show_progress(docnames, message, i, description):
	n = len(docnames)
	if n >= 10:
		frappe.publish_progress(float(i) * 100 / n, title=message, description=description)
