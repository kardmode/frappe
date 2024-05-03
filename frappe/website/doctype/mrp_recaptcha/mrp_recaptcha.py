# Copyright (c) 2024, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
import requests
from frappe.model.document import Document

class MRPRecaptcha(Document):
	pass

@frappe.whitelist(allow_guest=True)
def verify_recaptcha(token):
    recaptcha_secret_key = "6LeuurMpAAAAAEkVwVZSvSGrRVB4P9gpfWlm69Xr"
    response = requests.post("https://www.google.com/recaptcha/api/siteverify", 
                             data={"secret": recaptcha_secret_key, "response": token})
    
    # Parse response from Google API
    if response.status_code == 200:
        result = response.json()
		success = result.get('success', None)
		
		if success == True:
			return float( result.get('score', 1) ) 
		else:
			return False
    else:
        return False
		
	

	