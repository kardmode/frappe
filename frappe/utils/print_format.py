from __future__ import unicode_literals

import frappe, os
from frappe import _

from frappe.utils.pdf import get_pdf,cleanup
from PyPDF2 import PdfFileWriter

no_cache = 1
no_sitemap = 1

base_template_path = "templates/www/printview.html"
standard_format = "templates/print_formats/standard.html"



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

def download_multi_pdf(doctype, name, format=None,orientation="Portrait",letterhead=None,sign_type=None):
	"""
	Concatenate multiple docs as PDF .

	Returns a PDF compiled by concatenating multiple documents. The documents
	can be from a single DocType or multiple DocTypes

	Note: The design may seem a little weird, but it exists exists to
		ensure backward compatibility. The correct way to use this function is to
		pass a dict to doctype as described below

	NEW FUNCTIONALITY
	=================
	Parameters:
	doctype (dict):
		key (string): DocType name
		value (list): of strings of doc names which need to be concatenated and printed
	name (string):
		name of the pdf which is generated
	format:
		Print Format to be used

	Returns:
	PDF: A PDF generated by the concatenation of the mentioned input docs

	OLD FUNCTIONALITY - soon to be deprecated
	=========================================
	Parameters:
	doctype (string):
		name of the DocType to which the docs belong which need to be printed
	name (string or list):
		If string the name of the doc which needs to be printed
		If list the list of strings of doc names which needs to be printed
	format:
		Print Format to be used

	Returns:
	PDF: A PDF generated by the concatenation of the mentioned input docs
	"""

	import json
	output = PdfFileWriter()

	if not isinstance(doctype, dict):
		result = json.loads(name)

		# Concatenating pdf files
		for i, ss in enumerate(result):
			output = frappe.get_print(doctype, ss, format, as_pdf = True, output = output,options = {"orientation": orientation},letterhead=letterhead,sign_type=sign_type)
		
		
		frappe.local.response.filename = "{doctype}.pdf".format(doctype=doctype.replace(" ", "-").replace("/", "-"))
	else:
		for doctype_name in doctype:
			for doc_name in doctype[doctype_name]:
				try:
					output = frappe.get_print(doctype, ss, format, as_pdf = True, output = output,options = {"orientation": orientation},letterhead=letterhead,sign_type=sign_type)
				except Exception:
					frappe.log_error("Permission Error on doc {} of doctype {}".format(doc_name, doctype_name))
		frappe.local.response.filename = "{}.pdf".format(name)

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
	frappe.local.response.type = "pdf"
	
@frappe.whitelist()
def dpdf(dt, dn, ft=None,doc=None, nl=0,lh = None,on="Portrait",sn = None):
	html = frappe.get_print(dt, dn, ft, doc=doc, no_letterhead=nl,letterhead=lh,sign_type=sn)

	frappe.local.response.filename = "{name}.pdf".format(name=dn.replace(" ", "-").replace("/", "-"))
	frappe.local.response.filecontent = get_pdf(html, {"orientation": on})
	frappe.local.response.type = "pdf"


@frappe.whitelist()
def report_to_pdf(html, orientation="Landscape"):
	frappe.local.response.filename = "report.pdf"
	frappe.local.response.filecontent = get_pdf(html, {"orientation": orientation})
	frappe.local.response.type = "pdf"

@frappe.whitelist()
def print_by_server(doctype, name, print_format=None, doc=None, no_letterhead=0):
	print_settings = frappe.get_doc("Print Settings")
	try:
		import cups
	except ImportError:
		frappe.throw(_("You need to install pycups to use this feature!"))
		return
	try:
		cups.setServer(print_settings.server_ip)
		cups.setPort(print_settings.port)
		conn = cups.Connection()
		output = PdfFileWriter()
		output = frappe.get_print(doctype, name, print_format, doc=doc, no_letterhead=no_letterhead, as_pdf = True, output = output)
		file = os.path.join("/", "tmp", "frappe-pdf-{0}.pdf".format(frappe.generate_hash()))
		output.write(open(file,"wb"))
		conn.printFile(print_settings.printer_name,file , name, {})
	except IOError as e:
		if ("ContentNotFoundError" in e.message
			or "ContentOperationNotPermittedError" in e.message
			or "UnknownContentError" in e.message
			or "RemoteHostClosedError" in e.message):
			frappe.throw(_("PDF generation failed"))
	except cups.IPPError:
		frappe.throw(_("Printing failed"))
	finally:
		cleanup(file,{})
