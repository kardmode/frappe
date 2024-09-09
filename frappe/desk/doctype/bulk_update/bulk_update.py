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
		
		# set update_value to field: to dynamically get a field value from that doc
		if self.sql_update:
			# Check if update_value is a dynamic field reference
			if self.update_value.startswith('field:'):
				meta = frappe.get_meta(self.document_type)

				# Extract the field name from update_value
				referenced_field = self.update_value[6:]
				# Check if the referenced field exists in the DocType
				if not meta.has_field(referenced_field):
					frappe.throw(f"Referenced field '{referenced_field}' does not exist in DocType '{self.document_type}'.")

				# Construct a safe SQL query to update based on the referenced field value
				# Note: Use frappe.db.escape to avoid SQL injection issues
				update_query = f"""UPDATE `tab{self.document_type}` AS t1 SET t1.`{self.field}` = (SELECT t2.`{referenced_field}` FROM `tab{self.document_type}` AS t2 WHERE t2.name = t1.name LIMIT 1){condition} LIMIT {limit}"""
				# frappe.errprint(update_query)
				frappe.db.sql(update_query)
				
			else:
				frappe.db.sql(
					f"""UPDATE `tab{self.document_type}` SET {self.field} = {self.update_value}{condition} limit {limit}"""
				)
				return [[],docnames]
			
		else:
			return submit_cancel_or_update_docs(
				self.document_type, docnames, "update", {self.field: self.update_value}, self.ignore_validate_update_after_submit
			)


@frappe.whitelist()
def submit_cancel_or_update_docs(doctype, docnames, action="submit", data=None, ignore_validate_update_after_submit=None):
	docnames = frappe.parse_json(docnames)

	if len(docnames) < 20:
		return _bulk_action(doctype, docnames, action, data, ignore_validate_update_after_submit)
	elif len(docnames) <= 500:
		frappe.msgprint(_("Bulk operation is enqueued in background."), alert=True)
		frappe.enqueue(
			_bulk_action,
			doctype=doctype,
			docnames=docnames,
			action=action,
			data=data,
			ignore_validate_update_after_submit=ignore_validate_update_after_submit,
			queue="short",
			timeout=1000,
		)
	else:
		frappe.throw(_("Bulk operations only support up to 500 documents."), title=_("Too Many Documents"))


def _bulk_action(doctype, docnames, action, data, ignore_validate_update_after_submit=None):
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
				custom_update = False
				custom_data = {}
				for key in data:
					if data[key].startswith('field:'):
						fieldname = (data[key])[6:]
						
						if doc.get(fieldname):
							field_value = doc.get(fieldname)
						else:
							continue
							
						custom_update = True
						custom_data[key] = field_value
				if custom_update:
					doc.update(custom_data)
				else:
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
	frappe.publish_progress(float(i) * 100 / n, title=message, description=description)
