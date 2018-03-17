from __future__ import unicode_literals

import frappe, os, copy, json, re
from frappe import _

from frappe.modules import get_doc_path
from jinja2 import TemplateNotFound
from frappe.utils import cint, strip_html
from frappe.utils.pdf import get_pdf
from PyPDF2 import PdfFileWriter, PdfFileReader

no_cache = 1
no_sitemap = 1

base_template_path = "templates/www/printview.html"
standard_format = "templates/print_formats/standard.html"

@frappe.whitelist()
def download_multi_pdf(doctype, name, format=None,orientation="Portrait",letterhead=None,sign_type=None):
	# name can include names of many docs of the same doctype.

	import json
	result = json.loads(name)
	
	# Concatenating pdf files
	output = PdfFileWriter()
	for i, ss in enumerate(result):
		output = frappe.get_print(doctype, ss, format, as_pdf = True, output = output,options = {"orientation": orientation},letterhead=letterhead,sign_type=sign_type)
		
	frappe.local.response.filename = "{doctype}.pdf".format(doctype=doctype.replace(" ", "-").replace("/", "-"))
	frappe.local.response.filecontent = read_multi_pdf(output)
	frappe.local.response.type = "download"

@frappe.whitelist()
def download_multi_pdf_with_cover(doctype, name, format=None,cover_doctype = None,cover_name=None,cover_format = None,orientation="Portrait",letterhead=None):
	# name can include names of many docs of the same doctype.

	import json
	result = json.loads(name)
	
	# Concatenating pdf files
	output = PdfFileWriter()
	if cover_name and cover_doctype and cover_format:
		output = frappe.get_print(cover_doctype, cover_name, cover_format, as_pdf = True, output = output,options = {"orientation": orientation},letterhead=letterhead)

	
	for i, ss in enumerate(result):
		output = frappe.get_print(doctype, ss, format, as_pdf = True, output = output,options = {"orientation": orientation},letterhead=letterhead)
	
	
	
	frappe.local.response.filename = "{doctype}.pdf".format(doctype=doctype.replace(" ", "-").replace("/", "-"))
	frappe.local.response.filecontent = read_multi_pdf(output)
	frappe.local.response.type = "download"
	
@frappe.whitelist()
def download_multi_pdf_html_combined(doctype, name, format=None,cover_doctype = None,cover_name=None,cover_format = None,orientation="Portrait",letterhead=None):
	# name can include names of many docs of the same doctype.

	import json
	result = json.loads(name)
	
	if cover_name and cover_doctype and cover_format:
		html = frappe.get_print(cover_doctype, cover_name, cover_format, doc=None)
	else:
		html = ""
	
	# Concatenating pdf files
	
	output = ""
	for i, ss in enumerate(result):
		output = frappe.get_print(doctype, ss, format, doc=None)
		html = str(html) + str(output)
		
	frappe.local.response.filename = "{doctype}.pdf".format(doctype=doctype.replace(" ", "-").replace("/", "-"))
	frappe.local.response.filecontent = get_pdf(html,{"orientation": orientation})
	frappe.local.response.type = "download"

def read_multi_pdf(output):
	# Get the content of the merged pdf files
	fname = os.path.join("/tmp", "frappe-pdf-{0}.pdf".format(frappe.generate_hash()))
	output.write(open(fname,"wb"))

	with open(fname, "rb") as fileobj:
		filedata = fileobj.read()

	return filedata

@frappe.whitelist()
def download_pdf(doctype, name, format=None,doc=None, no_letterhead=0,letterhead = None,orientation="Portrait",sign_type = None):
	html = frappe.get_print(doctype, name, format, doc=doc, no_letterhead=no_letterhead,letterhead=letterhead,sign_type = sign_type)

	frappe.local.response.filename = "{name}.pdf".format(name=name.replace(" ", "-").replace("/", "-"))
	frappe.local.response.filecontent = get_pdf(html, {"orientation": orientation})
	frappe.local.response.type = "download"
	
@frappe.whitelist()
def dpdf(dt, dn, ft=None,doc=None, nl=0,lh = None,on="Portrait",sn = None):
	html = frappe.get_print(dt, dn, ft, doc=doc, no_letterhead=nl,letterhead=lh,sign_type=sn)

	frappe.local.response.filename = "{name}.pdf".format(name=dn.replace(" ", "-").replace("/", "-"))
	frappe.local.response.filecontent = get_pdf(html, {"orientation": on})
	frappe.local.response.type = "download"

@frappe.whitelist()
def report_to_pdf(html, orientation="Landscape"):
	frappe.local.response.filename = "report.pdf"
	frappe.local.response.filecontent = get_pdf(html, {"orientation": orientation})
	frappe.local.response.type = "download"


