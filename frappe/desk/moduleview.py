# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
import json
from frappe import _
from frappe.boot import get_allowed_pages, get_allowed_reports
from frappe.desk.doctype.desktop_icon.desktop_icon import set_hidden, clear_desktop_icons_cache
from operator import itemgetter

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

def get_data(module, build=True):
	"""Get module data for the module view `desk/#Module/[name]`"""
	doctype_info = get_doctype_info(module)

	data = build_standard_config(module, doctype_info)
	
	if not data:
		data = build_config_from_file(module)
		add_custom_doctypes(data, doctype_info,module)
		
	
	
	
	if module == "Setup":
		if frappe.conf.get('developer_mode'):
			doctype_info = get_doctype_info("Core")
			data += build_standard_config("Core", doctype_info)
			
	data = combine_common_sections(data)
	data = apply_permissions(data)

	# set_last_modified(data)
	

	if build:
		exists_cache = {}
		def doctype_contains_a_record(name):
			exists = exists_cache.get(name)
			if not exists:
				if not frappe.db.get_value('DocType', name, 'issingle'):
					exists = frappe.db.count(name)
				else:
					exists = True
				exists_cache[name] = exists
			return exists

		for section in data:
			for item in section["items"]:
				# Onboarding

				# First disable based on exists of depends_on list
				doctype = item.get("doctype")
				dependencies = item.get("dependencies") or None
				if not dependencies and doctype:
					item["dependencies"] = [doctype]

				dependencies = item.get("dependencies")
				if dependencies:
					incomplete_dependencies = [d for d in dependencies if not doctype_contains_a_record(d)]
					if len(incomplete_dependencies):
						item["incomplete_dependencies"] = incomplete_dependencies

				if item.get("onboard"):
					# Mark Spotlights for initial
					if item.get("type") == "doctype":
						name = item.get("name")
						count = doctype_contains_a_record(name)

						item["count"] = count

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
	data = []

	"""Build standard module data from DocTypes."""
	if not frappe.db.get_value("Module Def", module):
		return data

	add_custom_doctypes(data, doctype_info,module)

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

def get_disabled_reports():
	if not hasattr(frappe.local, "disabled_reports"):
		frappe.local.disabled_reports = set(r.name for r in frappe.get_all("Report", {"disabled": 1}))
	return frappe.local.disabled_reports

def get_config(app, module):
	"""Load module info from `[app].config.[module]`."""
	config = frappe.get_module("{app}.config.{module}".format(app=app, module=module))
	config = config.get_data()

	sections = [s for s in config if s.get("condition", True)]

	disabled_reports = get_disabled_reports()
	for section in sections:
		items = []
		for item in section["items"]:
			if item["type"]=="report" and item["name"] in disabled_reports:
				continue
			if not item.get("label"):
				item["label"] = _(item["name"])
			# if not "icon" in item:
				# item["icon"] = "fa fa-file-text"
			# elif item["icon"] == "" or item["icon"] == None:
				# item["icon"] = "fa fa-file-text"
			item["icon"] = ""	
		if not "shown_in" in section:
			 section["shown_in"] = "module_view"
	return config


def config_exists(app, module):
	try:
		frappe.get_module("{app}.config.{module}".format(app=app, module=module))
		return True
	except ImportError:
		return False

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


def get_onboard_items(app, module):
	try:
		sections = get_config(app, module)
	except ImportError:
		return []

	onboard_items = []
	fallback_items = []

	if not sections:
		doctype_info = get_doctype_info(module)
		sections = build_standard_config(module, doctype_info)

	for section in sections:
		for item in section["items"]:
			if item.get("onboard", 0) == 1:
				onboard_items.append(item)

			# in case onboard is not set
			fallback_items.append(item)

			if len(onboard_items) > 5:
				return onboard_items

	return onboard_items or fallback_items

@frappe.whitelist()
def get_links_for_module(app, module):
	return [l.get('label') for l in get_links(app, module)]

def get_links(app, module):
	try:
		sections = get_config(app, frappe.scrub(module))
	except ImportError:
		return []

	links = []
	for section in sections:
		for item in section['items']:
			links.append(item)
	return links

@frappe.whitelist()
def get_desktop_settings():
	from frappe.config import get_modules_from_all_apps_for_user
	all_modules = get_modules_from_all_apps_for_user()
	home_settings = get_home_settings()

	modules_by_name = {}
	for m in all_modules:
		modules_by_name[m['module_name']] = m

	module_categories = ['Modules', 'Domains', 'Places', 'Administration']
	user_modules_by_category = {}

	user_saved_modules_by_category = home_settings.modules_by_category or {}
	user_saved_links_by_module = home_settings.links_by_module or {}

	def apply_user_saved_links(module):
		module = frappe._dict(module)
		all_links = get_links(module.app, module.module_name)
		module_links_by_label = {}
		for link in all_links:
			if 'label' not in link:
				link['label'] = link['name']
			module_links_by_label[link['label']] = link
			
		if module.module_name in user_saved_links_by_module:
			user_links = frappe.parse_json(user_saved_links_by_module[module.module_name])
			module.links = [module_links_by_label[l] for l in user_links if l in module_links_by_label]

		return module

	for category in module_categories:
		if category in user_saved_modules_by_category:
			user_modules = user_saved_modules_by_category[category]
			user_modules_by_category[category] = [apply_user_saved_links(modules_by_name[m]) \
				for m in user_modules if modules_by_name.get(m)]
		else:
			user_modules_by_category[category] = [apply_user_saved_links(m) \
				for m in all_modules if m.get('category') == category]

	# filter out hidden modules
	if home_settings.hidden_modules:
		for category in user_modules_by_category:
			hidden_modules = home_settings.hidden_modules or []
			modules = user_modules_by_category[category]
			user_modules_by_category[category] = [module for module in modules if module.module_name not in hidden_modules]

	return user_modules_by_category

@frappe.whitelist()
def update_hidden_modules(category_map):
	category_map = frappe.parse_json(category_map)
	home_settings = get_home_settings()

	saved_hidden_modules = home_settings.hidden_modules or []

	for category in category_map:
		config = frappe._dict(category_map[category])
		saved_hidden_modules += config.removed or []
		saved_hidden_modules = [d for d in saved_hidden_modules if d not in (config.added or [])]

	home_settings.hidden_modules = saved_hidden_modules
	set_home_settings(home_settings)

	return get_desktop_settings()


@frappe.whitelist()
def update_modules_order(module_category, modules):
	modules = frappe.parse_json(modules)
	home_settings = get_home_settings()

	home_settings.modules_by_category = home_settings.modules_by_category or {}
	home_settings.modules_by_category[module_category] = modules

	set_home_settings(home_settings)

@frappe.whitelist()
def update_links_for_module(module_name, links):
	links = frappe.parse_json(links)
	home_settings = get_home_settings()

	home_settings.setdefault('links_by_module', {})
	home_settings['links_by_module'].setdefault(module_name, None)
	home_settings['links_by_module'][module_name] = links

	set_home_settings(home_settings)

	return get_desktop_settings()

@frappe.whitelist()
def get_options_for_show_hide_cards():
	from frappe.config import get_modules_from_all_apps_for_user
	all_modules = get_modules_from_all_apps_for_user()
	home_settings = get_home_settings()

	hidden_modules = home_settings.hidden_modules or []

	options = []
	for module in all_modules:
		module = frappe._dict(module)
		options.append({
			'category': module.category,
			'label': module.label,
			'value': module.module_name,
			'checked': module.module_name not in hidden_modules
		})

	return options

def set_home_settings(home_settings):
	frappe.cache().hset('home_settings', frappe.session.user, home_settings)
	frappe.db.set_value('User', frappe.session.user, 'home_settings', json.dumps(home_settings))

@frappe.whitelist()
def get_home_settings():
	def get_from_db():
		settings = frappe.db.get_value("User", frappe.session.user, 'home_settings')
		return frappe.parse_json(settings or '{}')

	home_settings = frappe.cache().hget('home_settings', frappe.session.user, get_from_db)
	return home_settings


def get_module_link_items_from_list(app, module, list_of_link_names):
	try:
		sections = get_config(app, frappe.scrub(module))
	except ImportError:
		return []

	links = []
	for section in sections:
		for item in section["items"]:
			if item.get("label", "") in list_of_link_names:
				links.append(item)

	return links


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
			if frappe.db.is_table_missing(e):
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
			"is_query_report": 1 if r.report_type in ("Query Report", "Script Report", "Custom Report") else 0,
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
