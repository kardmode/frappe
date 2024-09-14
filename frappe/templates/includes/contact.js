// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.ready(function() {

	if(frappe.utils.get_url_arg('subject')) {
	  $('[name="subject"]').val(frappe.utils.get_url_arg('subject'));
	}

	$('.btn-send').off("click").on("click", function(e) {
		e.preventDefault();

		grecaptcha.ready(function() {
			grecaptcha.execute('6LeDKzsqAAAAAIZ8IgkNI_QmtFgKrXJ4q35TgHKb', {action: 'submit'}).then(function(token) {
				
				frappe.call({
					method: "mrp.mrp.doctype.mrp_recaptcha.mrp_recaptcha.verify_recaptcha",
					args: {
						token:token,
					},
					callback: function (r) {
						var email = $('[name="email"]').val();
						var message = $('[name="message"]').val();
							
						if(!(email)) {
							frappe.msgprint('{{ _("Please enter a valid email address.") }}');
							$('[name="email"]').focus();
							return false;
						}
						
						if(!(message)) {
							frappe.msgprint('{{ _("Please enter a message.") }}');
							$('[name="message"]').focus();
							return false;
						}

						if(!validate_email(email)) {
							frappe.msgprint('{{ _("Please enter a valid email address.") }}');
							$('[name="email"]').focus();
							return false;
						}
						
						if (r.message < 0.6)
						{
							frappe.msgprint('{{ _("Recaptcha Verification Failed.") }}');
							return false;
						}

						$("#contact-alert").toggle(false);
						frappe.send_message({
							subject: $('[name="subject"]').val(),
							sender: email,
							message: message,
							callback: function(r) {
								if (!r.exc) {
									frappe.msgprint('{{ _("Thank you for your message") }}', '{{ _("Message Sent") }}');
								}
								$(':input').val('');
							}
						}, this);
						return false;
					},
				});

			});
		});
		
		return false;

		
	});

});

var msgprint = function(txt) {
	if(txt) $("#contact-alert").html(txt).toggle(true);
}
