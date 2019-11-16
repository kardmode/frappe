# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.boot import get_allowed_pages, get_allowed_reports
from frappe.desk.doctype.desktop_icon.desktop_icon import set_hidden, clear_desktop_icons_cache
from operator import itemgetter

@frappe.whitelist()
def get_modules_data(modules):
	"""Returns data (sections, list of reports, counts) to render module view in desk:
	`/desk/#Module/[name]`."""
	data = []
	for module in modules:
		data.append(get_data(module))

	out = {
		"data": data
	}

	return out

@frappe.whitelist()
def get(module):
	"""Returns data (sections, list of reports, counts) to render module view in desk:
	`/desk/#Module/[name]`."""
	data = get_data(module)

	out = {
		"data": data
	}

	return out

@frappe.whitelist()
def hide_module(module):
	set_hidden(module, frappe.session.user, 1)
	clear_desktop_icons_cache()

def get_data(module):
	"""Get module data for the module view `desk/#Module/[name]`"""
	doctype_info = get_doctype_info(module)
	# data = build_config_from_file(module)

	# if not data:
		# data = build_standard_config(module, doctype_info)
	# else:
		# add_custom_doctypes(data, doctype_info,module)

	data = build_standard_config(module, doctype_info)
	
	if module == "Setup":
		if frappe.conf.get('developer_mode'):
			doctype_info = get_doctype_info("Core")
			data += build_standard_config("Core", doctype_info)
			
	data = combine_common_sections(data)
	data = apply_permissions(data)
	
	
		

	# for d in data:
		# _items = []
		# _items = sorted(d.get("items", []), key=itemgetter('name')) 

		# d.update({ "items": _items })

		


	return data

def build_config_from_file(module):
	"""Build module info from `app/config/desktop.py` files."""
	data = []
	module = frappe.scrub(module)

	for app in frappe.get_installed_apps():
		try:
			data += get_config(app, module)
		except ImportError:
			pass

	return filter_by_restrict_to_domain(data)

def filter_by_restrict_to_domain(data):
	""" filter Pages and DocType depending on the Active Module(s) """
	mapper = {
		"page": "Page",
		"doctype": "DocType"
	}
	active_domains = frappe.get_active_domains()

	for d in data:
		_items = []
		for item in d.get("items", []):
			doctype = mapper.get(item.get("type"))

			doctype_domain = frappe.db.get_value(doctype, item.get("name"), "restrict_to_domain") or ''
			if not doctype_domain or (doctype_domain in active_domains):
				_items.append(item)

		d.update({ "items": _items })

	return data

def get_custom_links(data,module):

	

	custom_links =  frappe.get_list("Module View Link", fields=["label","section","type","icon", "_doctype","_module","_report","_page","link"], filters=
		{"blocked": 0, "module_name": module})
		
	for link in custom_links:
	
		section_icon, section_color,section_shown_in = frappe.db.get_value("MRP Module Section", link.section, 
			["icon", "color","shown_in"])
			
		if section_shown_in != "none":
		
		
			name = link.label
			if link.type == "doctype":
				name = link._doctype
			elif link.type == "link":
				name = link.label
			elif link.type == "page":
				name = link._page
			elif link.type == "report":
				name = link._report
			elif link.type == "module" and link._module:
				doctype_info = get_doctype_info(link._module)
				
				items = []
				for d in doctype_info:
					if d.document_type:
						custom_shown_in = frappe.db.get_value("MRP Module Section", d.document_type, ["shown_in"])
						if custom_shown_in != "none":
							items.append(d)
						
				if items:
					add_section(data, _(link.section), section_icon, items,section_color,section_shown_in)
					
						
							
				continue
			
		
		
		
			add_section(data, _(link.section),section_icon,[
			{
				"type": link.type,
				"name": name,
				"icon": link.icon,
				"label": _(link.label),
				"link": link.link,
			}],section_color,section_shown_in)
	
	

def build_standard_config(module, doctype_info):
	"""Build standard module data from DocTypes."""
	if not frappe.db.get_value("Module Def", module):
		frappe.throw(_("Module Not Found"))

	data = []
	
	
	# Documents = ["Document", "Transaction"]
	# Setup = ["Master", "Setup"]
	# Other = ["Other"]
	# Tools = ["Tool"]
	
	custom_links =  frappe.get_list("MRP Module Section", fields=["name", "icon", "shown_in"],order_by="name")
	for link in custom_links:
		if link.shown_in != "none":
			add_section(data, _(link.name), link.icon,
				[d for d in doctype_info if (d.document_type == link.name)],link.color,link.shown_in)
				
	get_custom_links(data,module)
		
	# add_section(data, _("Document"), "fa fa-file-text",
		# [d for d in doctype_info if (d.document_type in Documents)],"darkred")
		
	add_section(data, _("Reports"), "fa fa-list",
		[d for d in get_custom_report_list(module)],"lightblue","module_menu")


	# add_section(data, _("Starred Reports"), "fa fa-star",
		# [d for d in get_report_list(module, is_standard="Yes") if (d["favorite"])],"lightblue")

	# add_section(data, _("Starred Reports"), "fa fa-star",
		# [d for d in get_report_list(module) if (d["favorite"])],"lightblue")
		
	# add_section(data, _("Setup"), "fa fa-cog",
		# [d for d in doctype_info if (d.document_type in Setup)],"darkblue")	
		
	
	
	# add_section(data, _("Tool"), "fa fa-wrench",
		# [d for d in doctype_info if (d.document_type in Tools)])
		
		
	# add_section(data, _("Reports"), "fa fa-list",
		# [d for d in get_report_list(module, is_standard="Yes") if (not d["favorite"])],"darkgreen","module_menu")
		
	# add_section(data, _("Reports"), "fa fa-list-alt",
		# [d for d in get_report_list(module) if (not d["favorite"])],"lightgreen","module_menu")
	
	# add_section(data, _("Other"), "fa fa-file",
		# [d for d in doctype_info if (d.document_type in Other)],"darkblue","module_menu")	

	return data

def add_section(data, label, icon, items,color="#7f8c8d",shown_in="module_view"):
	"""Adds a section to the module data."""
	if not items: return
	data.append({
		"label": label,
		"icon": icon,
		"items": items,
		"color":color,
		"shown_in":shown_in
	})


def add_custom_doctypes(data, doctype_info,module):
	# """Adds Custom DocTypes to modules setup via `config/desktop.py`."""
	# add_section(data, _("Documents"), "fa fa-file-text",
		# [d for d in doctype_info if ((d.custom or d.beta) and d.document_type in ("Document", "Transaction"))])

	# add_section(data, _("Setup"), "fa fa-cog",
		# [d for d in doctype_info if ((d.custom or d.beta) and d.document_type in ("Setup", "Master", ""))])
		
	custom_links =  frappe.get_list("MRP Module Section", fields=["name", "icon", "shown_in"],order_by="name")
	for link in custom_links:
		if link.shown_in != "none":
			add_section(data, _(link.name), link.icon,
				[d for d in doctype_info if (d.document_type == link.name)],link.color,link.shown_in)

	get_custom_links(data,module)

	add_section(data, _("Reports"), "fa fa-list",
		[d for d in get_custom_report_list(module)],"lightblue","module_menu")
		
def get_doctype_info(module):
	"""Returns list of non child DocTypes for given module."""
	active_domains = frappe.get_active_domains()

	doctype_info = frappe.get_all("DocType", filters={
		"module": module,
		"istable": 0
	}, or_filters={
		"ifnull(restrict_to_domain, '')": "",
		"restrict_to_domain": ("in", active_domains)
	}, fields=["'doctype' as type", "name", "description", "document_type",
		"custom", "issingle","beta","icon","custom_label as label"], order_by="custom asc, document_type desc, name asc")
		
		
	doctype_info += frappe.get_all("Page", filters={
		"module": module
	}, or_filters={
		"ifnull(restrict_to_domain, '')": "",
		"restrict_to_domain": ("in", active_domains)
	}, fields=["'page' as type", "name","title as label", "description", "document_type",
		"custom","beta","icon"], order_by="custom asc, document_type desc, name asc")


	for d in doctype_info:
		d.document_type = d.document_type or ""
		d.description = _(d.description or "")
		# if ('icon' not in d):
			# d["icon"] = "fa fa-file-text"
		# elif d.icon == "" or d.icon == None:
			# d["icon"] = "fa fa-file-text"
		d["icon"] = ""
	return doctype_info

def combine_common_sections(data):
	"""Combine sections declared in separate apps."""
	sections = []
	sections_dict = {}
	for each in data:
		if each["label"] not in sections_dict:
			sections_dict[each["label"]] = each
			if 'icon' not in each:
				each["icon"] = "fa fa-file-text"
			elif each["icon"] == "" or each["icon"] == None:
				each["icon"] = "fa fa-file-text"
			sections.append(each)
		else:
			sections_dict[each["label"]]["items"] += each["items"]

	return sections

def apply_permissions(data):
	default_country = frappe.db.get_default("country")

	user = frappe.get_user()
	user.build_permissions()

	allowed_pages = get_allowed_pages()
	allowed_reports = get_allowed_reports()

	new_data = []
	for section in data:
		new_items = []

		for item in (section.get("items") or []):
			item = frappe._dict(item)

			if item.country and item.country!=default_country:
				continue

			if ((item.type=="doctype" and item.name in user.can_read)
				or (item.type=="page" and item.name in allowed_pages)
				or (item.type=="report" and item.name in allowed_reports)
				or item.type=="help"
				or item.type=="link"):

				new_items.append(item)

		if new_items:
			new_section = section.copy()
			new_section["items"] = new_items
			new_data.append(new_section)

	return new_data

def get_config(app, module):
	"""Load module info from `[app].config.[module]`."""
	config = frappe.get_module("{app}.config.{module}".format(app=app, module=module))
	config = config.get_data()

	for section in config:
		for item in section["items"]:
			if item["type"]=="report" and frappe.db.get_value("Report", item["name"], "disabled")==1:
				section["items"].remove(item)
				continue
			if not "label" in item:
				item["label"] = _(item["name"])
			# if not "icon" in item:
				# item["icon"] = "fa fa-file-text"
			# elif item["icon"] == "" or item["icon"] == None:
				# item["icon"] = "fa fa-file-text"
			item["icon"] = ""	
		if not "shown_in" in section:
			 section["shown_in"] = "module_view"
	return config

def add_setup_section(config, app, module, label, icon):
	"""Add common sections to `/desk#Module/Setup`"""
	try:
		setup_section = get_setup_section(app, module, label, icon)
		if setup_section:
			config.append(setup_section)
	except ImportError:
		pass

def get_setup_section(app, module, label, icon):
	"""Get the setup section from each module (for global Setup page)."""
	config = get_config(app, module)
	for section in config:
		if section.get("label")==_("Setup"):
			return {
				"label": label,
				"icon": icon,
				"items": section["items"],
				"shown_in":"module_view"
			}

def set_last_modified(data):
	for section in data:
		for item in section["items"]:
			if item["type"] == "doctype":
				item["last_modified"] = get_last_modified(item["name"])

def get_last_modified(doctype):
	def _get():
		try:
			last_modified = frappe.get_all(doctype, fields=["max(modified)"], as_list=True, limit_page_length=1)[0][0]
		except Exception as e:
			if e.args[0]==1146:
				last_modified = None
			else:
				raise

		# hack: save as -1 so that it is cached
		if last_modified==None:
			last_modified = -1

		return last_modified

	last_modified = frappe.cache().hget("last_modified", doctype, _get)

	if last_modified==-1:
		last_modified = None

	return last_modified

def get_report_list(module, is_standard="No"):
	"""Returns list on new style reports for modules."""
	reports =  frappe.get_list("Report", fields=["name", "ref_doctype", "report_type","favorite"], filters=
		{"is_standard": is_standard, "disabled": 0, "module": module},
		order_by="name")
		
	out = []
	for r in reports:
		out.append({
			"type": "report",
			"doctype": r.ref_doctype,
			"is_query_report": 1 if r.report_type in ("Query Report", "Script Report") else 0,
			"label": _(r.name),
			"name": r.name,
			"icon": "fa fa-list",
			"favorite":r.favorite
		})

	return out
	
def get_custom_report_list(module):
	"""Returns list on new style reports for modules."""
	reports =  frappe.get_list("Report", fields=["name", "ref_doctype", "report_type","favorite"], filters=
		{"disabled": 0, "module": module},
		order_by="favorite desc, name")
		
	out = []
	for r in reports:
		out.append({
			"type": "report",
			"doctype": r.ref_doctype,
			"is_query_report": 1 if r.report_type in ("Query Report", "Script Report", "Custom Report") else 0,
			"label": _(r.name),
			"name": r.name,
			"icon": "fa fa-star" if r.favorite == 1 else "",
			"favorite":r.favorite
		})

	return out
