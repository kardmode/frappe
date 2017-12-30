# -*- coding: utf-8 -*-
# Copyright (c) 2017, Frappe Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class BlockedAddress(Document):
	pass

def check_blocked_ips():
	max_ban_minutes = int(frappe.db.get_value('System Settings', None, 'block_ip_time') or 15)
	max_attempts = frappe.db.get_value('System Settings', None, 'max_invalid_login_attempts') or 5
	frappe.db.sql("""delete from `tabBlocked Address` where login_attempts > %s and posting_date <= datetime('now', '-%s minutes'))""",(max_attempts,max_ban_minutes));
