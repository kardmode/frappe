frappe.ui.form.ControlTextEditor = frappe.ui.form.ControlCode.extend({
	make_input: function() {
		this.has_input = true;
		this.make_editor();
		this.hide_elements_on_mobile();
		this.setup_drag_drop();
		this.setup_image_dialog();
		this.setting_count = 0;

		$(document).on('form-refresh', () => {
			// reset last keystroke when a new form is loaded
			this.last_keystroke_on = null;
		})
	},
	render_camera_button: (context) => {
		var ui     = $.summernote.ui;
		var button = ui.button({
			contents: '<i class="fa fa-camera"/>',
			tooltip: 'Camera',
			click: () => {
				const capture = new frappe.ui.Capture();
				capture.open();

				capture.click((data) => {
					context.invoke('editor.insertImage', data);
				});
			}
		});

		return button.render();
	},
	make_editor: function() {
		var me = this;
		this.editor = $("<div>").appendTo(this.input_area);

		// Note: while updating summernote, please make sure all 'p' blocks
		// in the summernote source code are replaced by 'div' blocks.
		// by default summernote, adds <p> blocks for new paragraphs, which adds
		// unexpected whitespaces, esp for email replies.

		this.editor.summernote({
			minHeight: 400,
			toolbar: [
				['magic', ['style']],
				['style', ['bold', 'italic', 'underline', 'clear']],
				['fontsize', ['fontsize']],
				['color', ['color']],
				['para', ['ul', 'ol', 'paragraph', 'hr']],
				//['height', ['height']],
				['media', ['link', 'picture', 'camera', 'video', 'table']],
				['misc', ['fullscreen', 'codeview']]
			],
			buttons: {
				camera: this.render_camera_button,
			},
			keyMap: {
				pc: {
					'CTRL+ENTER': ''
				},
				mac: {
					'CMD+ENTER': ''
				}
			},
			prettifyHtml: true,
			dialogsInBody: true,
			callbacks: {
				onInit: function() {
					// firefox hack that puts the caret in the wrong position
					// when div is empty. To fix, seed with a <br>.
					// See https://bugzilla.mozilla.org/show_bug.cgi?id=550434
					// this function is executed only once
					$(".note-editable[contenteditable='true']").one('focus', function() {
						var $this = $(this);
						if(!$this.html())
							$this.html($this.html() + '<br>');
					});
				},
				onChange: function(value) {
					me.parse_validate_and_set_in_model(value);
				},
				onKeydown: function(e) {
					me.last_keystroke_on = new Date();
					var key = frappe.ui.keys.get_key(e);
					// prevent 'New DocType (Ctrl + B)' shortcut in editor
					if(['ctrl+b', 'meta+b'].indexOf(key) !== -1) {
						e.stopPropagation();
					}
					if(key.indexOf('escape') !== -1) {
						if(me.note_editor.hasClass('fullscreen')) {
							// exit fullscreen on escape key
							me.note_editor
								.find('.note-btn.btn-fullscreen')
								.trigger('click');
						}
					}
				}/* ,
				onPaste: function (e) {
					var options = {cleaner: {
							action: 'both', // both|button|paste 'button' only cleans via toolbar button, 'paste' only clean when pasting content, both does both options.
							newline: '<br>', // Summernote's default is to use '<p><br></p>'
							notStyle: 'position:absolute;top:0;left:0;right:0',
							icon: '<i class="note-icon"><svg xmlns="http://www.w3.org/2000/svg" id="libre-paintbrush" viewBox="0 0 14 14" width="14" height="14"><path d="m 11.821425,1 q 0.46875,0 0.82031,0.311384 0.35157,0.311384 0.35157,0.780134 0,0.421875 -0.30134,1.01116 -2.22322,4.212054 -3.11384,5.035715 -0.64956,0.609375 -1.45982,0.609375 -0.84375,0 -1.44978,-0.61942 -0.60603,-0.61942 -0.60603,-1.469866 0,-0.857143 0.61608,-1.419643 l 4.27232,-3.877232 Q 11.345985,1 11.821425,1 z m -6.08705,6.924107 q 0.26116,0.508928 0.71317,0.870536 0.45201,0.361607 1.00781,0.508928 l 0.007,0.475447 q 0.0268,1.426339 -0.86719,2.32366 Q 5.700895,13 4.261155,13 q -0.82366,0 -1.45982,-0.311384 -0.63616,-0.311384 -1.0212,-0.853795 -0.38505,-0.54241 -0.57924,-1.225446 -0.1942,-0.683036 -0.1942,-1.473214 0.0469,0.03348 0.27455,0.200893 0.22768,0.16741 0.41518,0.29799 0.1875,0.130581 0.39509,0.24442 0.20759,0.113839 0.30804,0.113839 0.27455,0 0.3683,-0.247767 0.16741,-0.441965 0.38505,-0.753349 0.21763,-0.311383 0.4654,-0.508928 0.24776,-0.197545 0.58928,-0.31808 0.34152,-0.120536 0.68974,-0.170759 0.34821,-0.05022 0.83705,-0.07031 z"/></svg></i>',
							keepHtml: true, //Remove all Html formats
							keepOnlyTags: [], // If keepHtml is true, remove all tags except these
							keepClasses: false, //Remove Classes
							badTags: ['style', 'script', 'applet', 'embed', 'noframes', 'noscript', 'html'], //Remove full tags with contents
							badAttributes: ['style', 'start'], //Remove attributes from remaining tags
							limitChars: 520, // 0|# 0 disables option
							limitDisplay: 'both', // none|text|html|both
							limitStop: false // true/false
						}};
					
					function CleanPastedHTML(input,nlO) {
						var out = input;
						// 1. remove line breaks / Mso classes
						var sS = /(\n|\r| class=(")?Mso[a-zA-Z]+(")?)/g;
						out = out.replace(sS, ' ');
						
						var nL = /(\n)+/g;
						out = out.replace(nL, nlO);
						
						// 2. strip Word generated HTML comments
												// 3. remove tags leave content if any
						var cS = new RegExp('<!--(.*?)-->', 'gi');
						out = out.replace(cS, '');
						var tS = new RegExp('<(/)*(meta|link|\\?xml:|st1:|o:|font)(.*?)>', 'gi');
						out = out.replace(tS, '');

						// 4. Remove everything in between and including tags '<style(.)style(.)>'
						var bT = ['style', 'script','applet','embed','noframes','noscript'];

						for (var i = 0; i < bT.length; i++) {
							tS = new RegExp('<' + bT[i] + '\\b.*>.*</' + bT[i] + '>', 'gi');
							// tS = new RegExp('<'+badTags[i]+'.*?'+badTags[i]+'(.*?)>', 'gi');

							out = out.replace(tS, '');
						}
						
						/* var allowedTags = options.cleaner.keepOnlyTags;
							if (typeof(allowedTags) == "undefined") allowedTags = [];
							if (allowedTags.length > 0) {
								allowedTags = (((allowedTags||'') + '').toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
								var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
								ut = out.replace(tags, function($0, $1) {
									return allowedTags.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : ''
								});
							} */
						
						// 5. remove attributes ' style="..."'
						/* var bA = ['style', 'start'];
						
						for (var ii = 0; ii < bA.length; ii++ ) {
							//var aS=new RegExp(' ('+bA[ii]+'="(.*?)")|('+bA[ii]+'=\'(.*?)\')', 'gi');
							// var attributeStripper = new RegExp(' ' + badAttributes[i] + '="(.*?)"','gi');
							var aS = new RegExp(' ' + bA[ii] + '=[\'|"](.*?)[\'|"]', 'gi');
							out = out.replace(aS, '');
						}
						
						return out;
					};
				
					e.preventDefault();
					// var bufferText = e.originalEvent.clipboardData.getData('text/html');
					var bufferText = me.editor.summernote('code');
					// var cleanText = CleanPastedHTML(bufferText,options.cleaner.newline);
					
					me.editor.summernote('pasteHTML',bufferText);
					 */
					
				//} */
			},
			icons: {
				'align': 'fa fa-align',
				'alignCenter': 'fa fa-align-center',
				'alignJustify': 'fa fa-align-justify',
				'alignLeft': 'fa fa-align-left',
				'alignRight': 'fa fa-align-right',
				'indent': 'fa fa-indent',
				'outdent': 'fa fa-outdent',
				'arrowsAlt': 'fa fa-arrows-alt',
				'bold': 'fa fa-bold',
				'camera': 'fa fa-camera',
				'caret': 'caret',
				'circle': 'fa fa-circle',
				'close': 'fa fa-close',
				'code': 'fa fa-code',
				'eraser': 'fa fa-eraser',
				'font': 'fa fa-font',
				'frame': 'fa fa-frame',
				'italic': 'fa fa-italic',
				'link': 'fa fa-link',
				'unlink': 'fa fa-chain-broken',
				'magic': 'fa fa-magic',
				'menuCheck': 'fa fa-check',
				'minus': 'fa fa-minus',
				'orderedlist': 'fa fa-list-ol',
				'pencil': 'fa fa-pencil',
				'picture': 'fa fa-image',
				'question': 'fa fa-question',
				'redo': 'fa fa-redo',
				'square': 'fa fa-square',
				'strikethrough': 'fa fa-strikethrough',
				'subscript': 'fa fa-subscript',
				'superscript': 'fa fa-superscript',
				'table': 'fa fa-table',
				'textHeight': 'fa fa-text-height',
				'trash': 'fa fa-trash',
				'underline': 'fa fa-underline',
				'undo': 'fa fa-undo',
				'unorderedlist': 'fa fa-list-ul',
				'video': 'fa fa-video-camera'
			}
		});
		this.note_editor = $(this.input_area).find('.note-editor');
		// to fix <p> on enter
		//this.set_formatted_input('<div><br></div>');
	},
	setup_drag_drop: function() {
		var me = this;
		this.note_editor.on('dragenter dragover', false)
			.on('drop', function(e) {
				var dataTransfer = e.originalEvent.dataTransfer;

				if (dataTransfer && dataTransfer.files && dataTransfer.files.length) {
					me.note_editor.focus();

					var files = [].slice.call(dataTransfer.files);

					files.forEach(file => {
						me.get_image(file, (url) => {
							me.editor.summernote('insertImage', url, file.name);
						});
					});
				}
				e.preventDefault();
				e.stopPropagation();
			});
	},
	get_image: function (fileobj, callback) {
		var reader = new FileReader();

		reader.onload = function() {
			var dataurl = reader.result;
			// add filename to dataurl
			var parts = dataurl.split(",");
			parts[0] += ";filename=" + fileobj.name;
			dataurl = parts[0] + ',' + parts[1];
			callback(dataurl);
		};
		reader.readAsDataURL(fileobj);
	},
	hide_elements_on_mobile: function() {
		this.note_editor.find('.note-btn-underline,\
			.note-btn-italic, .note-fontsize,\
			.note-color, .note-height, .btn-codeview')
			.addClass('hidden-xs');
		if($('.toggle-sidebar').is(':visible')) {
			// disable tooltips on mobile
			this.note_editor.find('.note-btn')
				.attr('data-original-title', '');
		}
	},
	get_input_value: function() {
		return this.editor? this.editor.summernote('code'): '';
	},
	parse: function(value) {
		if(value == null) value = "";
		return frappe.dom.remove_script_and_style(value);
	},
	set_formatted_input: function(value) {
		if(value !== this.get_input_value()) {
			this.set_in_editor(value);
		}
	},
	set_in_editor: function(value) {
		// set values in editor only if
		// 1. value not be set in the last 500ms
		// 2. user has not typed anything in the last 3seconds
		// ---
		// we will attempt to cleanup the user's DOM, hence if this happens
		// in the middle of the user is typing, it creates a lot of issues
		// also firefox tends to reset the cursor for some reason if the values
		// are reset

		if(this.setting_count > 2) {
			// we don't understand how the internal triggers work,
			// so if someone is setting the value third time in 500ms,
			// then quit
			return;
		}

		this.setting_count += 1;

		let time_since_last_keystroke = moment() - moment(this.last_keystroke_on);

		if(!this.last_keystroke_on || (time_since_last_keystroke > 3000)) {
			// if 3 seconds have passed since the last keystroke and
			// we have not set any value in the last 1 second, do this
			setTimeout(() => this.setting_count = 0, 500);
			this.editor.summernote('code', value || '');
			this.last_keystroke_on = null;
		} else {
			// user is probably still in the middle of typing
			// so lets not mess up the html by re-updating it
			// keep checking every second if our 3 second barrier
			// has been completed, so that we can refresh the html
			this._setting_value = setInterval(() => {
				if(time_since_last_keystroke > 3000) {
					// 3 seconds done! lets refresh
					// safe to update
					if(this.last_value !== this.get_input_value()) {
						// if not already in sync, reset
						this.editor.summernote('code', this.last_value || '');
					}
					clearInterval(this._setting_value);
					this._setting_value = null;
					this.setting_count = 0;

					// clear timestamp of last keystroke
					this.last_keystroke_on = null;
				}
			}, 1000);
		}
	},
	set_focus: function() {
		return this.editor.summernote('focus');
	},
	set_upload_options: function() {
		var me = this;
		this.upload_options = {
			parent: this.image_dialog.get_field("upload_area").$wrapper,
			args: {},
			max_width: this.df.max_width,
			max_height: this.df.max_height,
			options: "Image",
			no_socketio: true,
			btn: this.image_dialog.set_primary_action(__("Insert")),
			on_no_attach: function() {
				// if no attachmemts,
				// check if something is selected
				var selected = me.image_dialog.get_field("select").get_value();
				if(selected) {
					me.editor.summernote('insertImage', selected);
					me.image_dialog.hide();
				} else {
					frappe.msgprint(__("Please attach a file or set a URL"));
				}
			},
			callback: function(attachment) {
				me.editor.summernote('insertImage', attachment.file_url, attachment.file_name);
				me.image_dialog.hide();
			},
			onerror: function() {
				me.image_dialog.hide();
			}
		};

		if ("is_private" in this.df) {
			this.upload_options.is_private = this.df.is_private;
		}

		if(this.frm) {
			this.upload_options.args = {
				from_form: 1,
				doctype: this.frm.doctype,
				docname: this.frm.docname
			};
		} else {
			this.upload_options.on_attach = function(fileobj, dataurl) {
				me.editor.summernote('insertImage', dataurl);
				me.image_dialog.hide();
				frappe.hide_progress();
			};
		}
	},

	setup_image_dialog: function() {
		this.note_editor.find('[data-original-title="Image"]').on('click', () => {
			if(!this.image_dialog) {
				this.image_dialog = new frappe.ui.Dialog({
					title: __("Image"),
					fields: [
						{fieldtype:"HTML", fieldname:"upload_area"},
						{fieldtype:"HTML", fieldname:"or_attach", options: __("Or")},
						{fieldtype:"Select", fieldname:"select", label:__("Select from existing attachments") },
					]
				});
			}

			this.image_dialog.show();
			this.image_dialog.get_field("upload_area").$wrapper.empty();

			// select from existing attachments
			var attachments = this.frm && this.frm.attachments.get_attachments() || [];
			var select = this.image_dialog.get_field("select");
			if(attachments.length) {
				attachments = $.map(attachments, function(o) { return o.file_url; });
				select.df.options = [""].concat(attachments);
				select.toggle(true);
				this.image_dialog.get_field("or_attach").toggle(true);
				select.refresh();
			} else {
				this.image_dialog.get_field("or_attach").toggle(false);
				select.toggle(false);
			}
			select.$input.val("");

			this.set_upload_options();
			frappe.upload.make(this.upload_options);
		});
	}
});

