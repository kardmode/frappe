# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import print_function, unicode_literals

import re

import requests
import requests.exceptions
from jinja2.exceptions import TemplateSyntaxError

import frappe
from frappe import _
from frappe.utils import get_datetime, now, strip_html
from frappe.utils.jinja import render_template
from frappe.website.doctype.website_slideshow.website_slideshow import get_slideshow
from frappe.website.router import resolve_route
from frappe.website.utils import (extract_title, find_first_image, get_comment_list,
	get_html_content_based_on_type)
from frappe.website.website_generator import WebsiteGenerator


class WebPage(WebsiteGenerator):
	def validate(self):
		self.validate_dates()
		self.set_route()

	def get_feed(self):
		return self.title

	def get_context(self, context):
		context.main_section = get_html_content_based_on_type(self, 'main_section', self.content_type)
		self.render_dynamic(context)

		# if static page, get static content
		if context.slideshow:
			context.update(get_slideshow(self))

		if self.enable_comments:
			context.comment_list = get_comment_list(self.doctype, self.name)

		context.update({
			"style": self.css or "",
			"script": self.javascript or "",
			"header": self.header,
			"title": self.title,
			"text_align": self.text_align,
		})
		

		# set format data
		import json
		format_data = json.loads(self.format_data)
		for d in format_data:
			if 'label' in d and not d["label"] == "Website Slideshow" and d["fieldtype"] == "Website Slideshow":
				slideshow = frappe.get_doc("Website Slideshow", d["label"])
				
				d["options"] =  {
				"slides": slideshow.get({"doctype":"Website Slideshow Item"}),
				"slideshow_header": slideshow.header or "",
				"slideshow_height": slideshow.slideshow_height or "",
				"slideshow_blur": slideshow.slideshow_blur or "",
				"slideshow_shade": slideshow.slideshow_shade or "",
				"type": slideshow.type or "",
				"carousel_interval": slideshow.carousel_interval or "",
				"hide_buttons": slideshow.hide_buttons or "",
				"thumbnail_width": slideshow.thumbnail_width or "",
				"thumbnail_height": slideshow.thumbnail_height or ""
				}
			
				
		context.update({"layout":make_layout(self, format_data)})

		if not self.show_title:
			context["no_header"] = 1

		self.set_metatags(context)
		self.set_breadcrumbs(context)
		self.set_title_and_header(context)

		return context

	def render_dynamic(self, context):
		# dynamic
		is_jinja = context.dynamic_template or "<!-- jinja -->" in context.main_section
		if is_jinja or ("{{" in context.main_section):
			try:
				context["main_section"] = render_template(context.main_section,
					context)
				if not "<!-- static -->" in context.main_section:
					context["no_cache"] = 1
			except TemplateSyntaxError:
				if is_jinja:
					raise

	def set_breadcrumbs(self, context):
		"""Build breadcrumbs template """
		if self.breadcrumbs:
			context.parents = frappe.safe_eval(self.breadcrumbs, { "_": _ })
		if not "no_breadcrumbs" in context:
			if "<!-- no-breadcrumbs -->" in context.main_section:
				context.no_breadcrumbs = 1

	def set_title_and_header(self, context):
		"""Extract and set title and header from content or context."""
		if not "no_header" in context:
			if "<!-- no-header -->" in context.main_section:
				context.no_header = 1

		if not context.title:
			context.title = extract_title(context.main_section, context.path_name)

		# header
		if context.no_header and "header" in context:
			context.header = ""

		if not context.no_header:
			# if header not set and no h1 tag in the body, set header as title
			if not context.header and "<h1" not in context.main_section:
				context.header = context.title

			# add h1 tag to header
			if context.get("header") and not re.findall("<h.>", context.header):
				context.header = "<h1>" + context.header + "</h1>"

		# if title not set, set title from header
		if not context.title and context.header:
			context.title = strip_html(context.header)

	def add_hero(self, context):
		"""Add a hero element if specified in content or hooks.
		Hero elements get full page width."""
		context.hero = ""
		if "<!-- start-hero -->" in context.main_section:
			parts1 = context.main_section.split("<!-- start-hero -->")
			parts2 = parts1[1].split("<!-- end-hero -->")
			context.main_section = parts1[0] + parts2[1]
			context.hero = parts2[0]

	def check_for_redirect(self, context):
		if "<!-- redirect:" in context.main_section:
			frappe.local.flags.redirect_location = \
				context.main_section.split("<!-- redirect:")[1].split("-->")[0].strip()
			raise frappe.Redirect

	def set_metatags(self, context):
		context.metatags = {
			"name": context.title
		}

		image = find_first_image(context.main_section or "")
		if image:
			context.metatags["image"] = image

	def validate_dates(self):
		if self.end_date:
			if self.start_date and get_datetime(self.end_date) < get_datetime(self.start_date):
				frappe.throw(_("End Date cannot be before Start Date!"))

			# If the current date is past end date, and
			# web page is published, empty the end date
			if self.published and now() > self.end_date:
				self.end_date = None

				frappe.msgprint(_("Clearing end date, as it cannot be in the past for published pages."))


def check_publish_status():
	web_pages = frappe.get_all("Web Page", fields=["name", "published", "start_date", "end_date"])
	now_date = get_datetime(now())

	for page in web_pages:
		start_date = page.start_date if page.start_date else ""
		end_date = page.end_date if page.end_date else ""

		if page.published:
			# Unpublish pages that are outside the set date ranges
			if (start_date and now_date < start_date) or (end_date and now_date > end_date):
				frappe.db.set_value("Web Page", page.name, "published", 0)
		else:
			# Publish pages that are inside the set date ranges
			if start_date:
				if not end_date or (end_date and now_date < end_date):
					frappe.db.set_value("Web Page", page.name, "published", 1)



def check_broken_links():
	cnt = 0
	for p in frappe.db.sql("select name, main_section from `tabWeb Page`", as_dict=True):
		for link in re.findall('href=["\']([^"\']*)["\']', p.main_section):
			if link.startswith("http"):
				try:
					res = requests.get(link)
				except requests.exceptions.SSLError:
					res = frappe._dict({"status_code": "SSL Error"})
				except requests.exceptions.ConnectionError:
					res = frappe._dict({"status_code": "Connection Error"})

				if res.status_code!=200:
					print("[{0}] {1}: {2}".format(res.status_code, p.name, link))
					cnt += 1
			else:
				link = link[1:] # remove leading /
				link = link.split("#")[0]

				if not resolve_route(link):
					print(p.name + ":" + link)
					cnt += 1

	print("{0} links broken".format(cnt))


def make_layout(doc, format_data=None):
	"""Builds a hierarchical layout object from the fields list to be rendered
	by `standard.html`
	:param doc: Document to be rendered.
	:param format_data: Fields sequence and properties defined by Print Format Builder."""
	layout, page = [], []
	layout.append(page)

	def get_new_section(): return  {'columns': [], 'has_data': False}

	def append_empty_field_dict_to_page_column(page):
		""" append empty columns dict to page layout """
		if not page[-1]['columns']:
			page[-1]['columns'].append({'fields': []})

	for df in format_data:
		if df['fieldtype']=="Section Break" or page==[]:
			if len(page) > 1:
				if page[-1]['has_data']==False:
					# truncate last section if empty
					del page[-1]

			section = get_new_section()
			if df['fieldtype']=='Section Break':
				section.update(df)
				
			page.append(section)

		elif df['fieldtype']=="Column Break":
			# if last column break and last column is not empty
			page[-1]['columns'].append({'fields': []})

		else:
			# add a column if not yet added
			append_empty_field_dict_to_page_column(page)

		# if df['fieldtype']=="HTML" and df['options']:
			# doc.set(df['fieldname'], True) # show this field
		
		if not df['fieldtype'] in ("Section Break", "Column Break", "Button"):
		

			append_empty_field_dict_to_page_column(page)

			page[-1]['columns'][-1]['fields'].append(df)

			# section has fields
			page[-1]['has_data'] = True

			


	return layout
	
def is_visible(df, doc):
	"""Returns True if docfield is visible in print layout and does not have print_hide set."""
	if df.fieldtype in ("Section Break", "Column Break", "Button"):
		return False

	if hasattr(doc, "hide_in_print_layout"):
		if df.fieldname in doc.hide_in_print_layout:
			return False

	if (df.permlevel or 0) > 0 and not doc.has_permlevel_access_to(df.fieldname, df):
		return False

	return not doc.is_print_hide(df.fieldname, df)

def has_value(df, doc):
	value = doc.get(df.fieldname)
	if value in (None, ""):
		return False

	elif isinstance(value, string_types) and not strip_html(value).strip():
		if df.fieldtype in ["Text", "Text Editor"]:
			return True

		return False

	elif isinstance(value, list) and not len(value):
		return False

	return True