frappe.provide('frappe.desktop');

frappe.pages['desktop'].on_page_load = function(wrapper) {

	// load desktop
	if(!frappe.list_desktop) {
		frappe.desktop.set_background();
	}
	frappe.desktop.refresh(wrapper);
};

frappe.pages['desktop'].on_page_show = function(wrapper) {
	if(frappe.list_desktop) {
		$("body").attr("data-route", "list-desktop");
	}
	// $("body").attr("data-sidebar", 0);
};

$.extend(frappe.desktop, {
	refresh: function(wrapper) {
		if (wrapper) {
			this.wrapper = $(wrapper);
		}

		this.render();
		
		frappe.desktop.sort_inst = frappe.desktop.make_sortable();
		frappe.desktop.sortableDisable();
		// this.make_sortable();
	},

	render: function() {
		var me = this;
		frappe.utils.set_title(__("Desktop"));

		var template = frappe.list_desktop ? "desktop_list_view" : "desktop_icon_grid";

		var all_icons = frappe.get_desktop_icons();
		
		
		var user_icons = [];
		var module_icons = [];
		
		/* this.get_page_modules = () => {
		return frappe.get_desktop_icons(true)
			.filter(d => d.type==='module' && !d.blocked && !d.hide_in_module_sidebar)
			.sort((a, b) => { return (a._label > b._label) ? 1 : -1; });
		};
		
		module_icons = this.get_page_modules(); */
				
		all_icons.forEach(function(m, i) {
			if (m.type === "module") { 
			
				
				
			}
			else
			{
				user_icons.push(m);
				
			}


		});

		frappe.desktop.wrapper.html(frappe.render_template(template, {
			desktop_items: all_icons,
			module_items: module_icons,
			user_items:user_icons,
		}));
		
		
		this.setup_leftbar();
		frappe.desktop.setup_module_click();

		// notifications
		frappe.desktop.show_pending_notifications();
		$(document).on("notification-update", function() {
			me.show_pending_notifications();
		});

		$(document).trigger("desktop-render");

	},
	
	setup_leftbar: function () {
		
		this.get_page_modules = () => {
		return frappe.get_desktop_icons(true)
			.filter(d => d.type==='module' && !d.blocked && !d.hide_in_module_sidebar)
			.sort((a, b) => { return (a._label > b._label) ? 1 : -1; });
		};

		let get_module_sidebar_item = (item) => `<li class="strong module-sidebar-item">
			<a class="module-link" data-name="${item.module_name}" href="#modules/${item.module_name}">
				<i class="fa fa-chevron-right pull-right" style="display: none;"></i>
							<span class="sidebar-icon" style="background-color: ${item.color}"><i class="${item.icon}"></i></span>
				<span class="ellipsis">${item._label}</span>
			</a>
		</li>`;

		let get_sidebar_html = () => {
			let sidebar_items_html = this.get_page_modules()
				.map(get_module_sidebar_item.bind(this)).join("");

			let sidebar_home_html = `<li class="strong module-sidebar-item">
				<a class="module-link active" href="#">
				<span class="sidebar-icon"><i class="octicon octicon-home"></i></span>
				<span class="ellipsis">Home</span>
				</a></li>`;
				
			return `<ul class="module-sidebar-nav overlay-sidebar nav nav-pills nav-stacked">
				${sidebar_home_html}
				${sidebar_items_html}
				<li class="divider"></li>
			</ul>`;
		};
		
		this.left_sidebar = this.wrapper.find(".layout-side-section.layout-left");
		// render sidebar
		this.left_sidebar.html(get_sidebar_html());
		
		var header = $('header');
		header.find(".toggle-sidebar").on("click", function () {
			var layout_side_section = $('.layout-side-section.layout-left');
			var overlay_sidebar = layout_side_section.find('.overlay-sidebar');
			var close_sidebar_div = $('.close-sidebar');
			var fadespeed = 50;
			var scroll_container = $('html');
			
			
			
			if(overlay_sidebar.hasClass('opened') === false)
			{
				
			}
			else
			{
				
				

			}
			
			
			overlay_sidebar.addClass('opened');
			overlay_sidebar.find('.reports-dropdown')
				.removeClass('dropdown-menu')
				.addClass('list-unstyled');
			overlay_sidebar.find('.dropdown-toggle')
				.addClass('text-muted').find('.caret')
				.addClass('hidden-xs hidden-sm');
				
				
			if (close_sidebar_div.length !== 0)
			{
				close_sidebar_div.hide().fadeIn(fadespeed);
			}
			else{
				//$('<div class="close-sidebar">').hide().appendTo(layout_side_section).fadeIn(fadespeed);
			}
			

			

			
			scroll_container.css("overflow-y", "hidden");


			close_sidebar_div.on('click', close_sidebar);
			
			// close_sidebar_div.on('touchstart', function (e) { e.preventDefault(); }); 
			close_sidebar_div.on('touchmove', function (e) { e.preventDefault(); }); 
			
			layout_side_section.on("click", "a", close_sidebar);
					
			
			
			
			

			function close_sidebar(e) {
					scroll_container.css("overflow-y", "");

					close_sidebar_div.fadeOut(50,function() {
						overlay_sidebar.removeClass('opened')
							.find('.dropdown-toggle')
							.removeClass('text-muted');
						overlay_sidebar.find('.reports-dropdown')
							.addClass('dropdown-menu');
					});
			}
		});
	},
	
	render_help_messages: function(help_messages) {
		var wrapper = frappe.desktop.wrapper.find('.help-message-wrapper');
		var $help_messages = wrapper.find('.help-messages');

		var set_current_message = function(idx) {
			idx = cint(idx);
			wrapper.current_message_idx = idx;
			wrapper.find('.left-arrow, .right-arrow').addClass('disabled');
			wrapper.find('.help-message-item').addClass('hidden');
			wrapper.find('[data-message-idx="'+idx+'"]').removeClass('hidden');
			if(idx > 0) {
				wrapper.find('.left-arrow').removeClass('disabled');
			}
			if(idx < help_messages.length - 1) {
				wrapper.find('.right-arrow').removeClass('disabled');
			}
		}

		if(help_messages) {
			wrapper.removeClass('hidden');
			help_messages.forEach(function(message, i) {
				var $message = $('<div class="help-message-item hidden"></div>')
					.attr('data-message-idx', i)
					.html(frappe.render_template('desktop_help_message', message))
					.appendTo($help_messages);

			});

			set_current_message(0);

			wrapper.find('.close').on('click', function() {
				wrapper.addClass('hidden');
			});
		}

		wrapper.find('.left-arrow').on('click', function() {
			if(wrapper.current_message_idx) {
				set_current_message(wrapper.current_message_idx - 1);
			}
		})

		wrapper.find('.right-arrow').on('click', function() {
			if(help_messages.length > wrapper.current_message_idx + 1) {
				set_current_message(wrapper.current_message_idx + 1);
			}
		});

	},

	setup_module_click: function() {
		frappe.desktop.wiggling = false;

		if(frappe.list_desktop) {
			frappe.desktop.wrapper.on("click", ".desktop-list-item", function() {
				frappe.desktop.open_module($(this));
			});
		} else {
			frappe.desktop.wrapper.on("click", ".app-icon", function() {
				if ( !frappe.desktop.wiggling ) {
					frappe.desktop.open_module($(this).parent());
				}
			});
		}
		frappe.desktop.wrapper.on("click", ".circle", function() {
			var doctype = $(this).attr('data-doctype');
			if(doctype) {
				frappe.ui.notifications.show_open_count_list(doctype);
			}
		});

		frappe.desktop.setup_wiggle();
	},

	setup_wiggle: () => {
		var wrapper = frappe.desktop.wrapper.find('#icon-grid');
		
		// Wiggle, Wiggle, Wiggle.
		const DURATION_LONG_PRESS = 1200;

		var   timer_id      = 0;
		const $cases        = wrapper.find('.case-wrapper');
		const $icons        = wrapper.find('.app-icon');
		
		const clearWiggle   = () => {
			
			let $notis        = $(wrapper.find('.module-notis').toArray().filter((object) => {
				const text      = $(object).find('.circle-text').html();
				
				if(text)
					return object;
				else
					return null;
			}));
			
			const $closes   = $cases.find('.module-remove');
			$closes.addClass('hide');
			$notis.show();			
			$icons.removeClass('wiggle');
			frappe.desktop.wiggling   = false;
			frappe.desktop.sortableDisable();
		};

		wrapper.on('mousedown touchstart', '.app-icon', () => {
			timer_id     = setTimeout(() => {
				frappe.desktop.sortableEnable();
				frappe.desktop.wiggling = true;
				// hide all notifications.
				let $notis        = $(wrapper.find('.module-notis').toArray().filter((object) => {
					const text      = $(object).find('.circle-text').html();
					
					if(text)
						return object;
					else
						return null;
				}));
				
				$notis.hide();

				$cases.each((i) => {
					const $case    = $($cases[i]);
					const $close  = $case.find('.module-remove');
					
					$close.removeClass('hide');
					
					
					const name    = $case.attr('title');
					
					$close.off("click").click(() => {
						// good enough to create dynamic dialogs?
						const dialog = new frappe.ui.Dialog({
							title: __(`Hide ${name}?`)
						});
						dialog.set_primary_action(__('Hide'), () => {
							frappe.call({
								method: 'frappe.desk.doctype.desktop_icon.desktop_icon.hide',
								args: { name: name },
								freeze: true,
								callback: (response) =>
								{
									if ( response.message ) {
										location.reload();
									}
								}
							})

							dialog.hide();

							clearWiggle();
						});
						// Hacks, Hacks and Hacks.
						var $cancel = dialog.get_close_btn();
						$cancel.off("click").click(() => {
							clearWiggle();
						});
						$cancel.html(__(`Cancel`));

						dialog.show();
					});
				});

				$icons.addClass('wiggle');

			}, DURATION_LONG_PRESS);
		});
		wrapper.on('mouseup mouseleave touchend', '.app-icon', () => {
			clearTimeout(timer_id);
		});

		// also stop wiggling if clicked elsewhere.
		$('body').click((event) => {
			if ( frappe.desktop.wiggling ) {
				const $target = $(event.target);
				// our target shouldn't be .app-icons or .close
				const $parent = $target.parents('.case-wrapper');
				if ( $parent.length == 0 )
					clearWiggle();
			}
		});
		// end wiggle
	},

	open_module: function(parent) {
		var link = parent.attr("data-link");
		if(link) {
			if(link.indexOf('javascript:')===0) {
				eval(link.substr(11));
			} else if(link.substr(0, 1)==="/" || link.substr(0, 4)==="http") {
				window.open(link, "_blank");
			} else {
				frappe.set_route(link);
			}
			return false;
		} else {
			var module = frappe.get_module(parent.attr("data-name"));
			if (module && module.onclick) {
				module.onclick();
				return false;
			}
		}
	},

	sortableEnable: function() {
		if (/* frappe.dom.is_touchscreen() ||  */frappe.list_desktop || !frappe.desktop.sort_inst) {
			return;
		}
		
		frappe.desktop.sort_inst.options["disabled"] = false;
		return false;
	},
	sortableDisable: function() {
		if (/* frappe.dom.is_touchscreen() ||  */frappe.list_desktop || !frappe.desktop.sort_inst) {
			return;
		}
		
		frappe.desktop.sort_inst.options["disabled"] = true;
		return false;
	},
	
	make_sortable: function() {
		if (/* frappe.dom.is_touchscreen() || */ frappe.list_desktop) {
			return;
		}
		
		return new Sortable($("#icon-grid").get(0), {
			onUpdate: function(event) {
				var new_order = [];
				$("#icon-grid .case-wrapper").each(function(i, e) {
					new_order.push($(this).attr("data-name"));
				});

				frappe.call({
					method: 'frappe.desk.doctype.desktop_icon.desktop_icon.set_order',
					args: {
						'new_order': new_order,
						'user': frappe.session.user
					},
					quiet: true
				});
			}
		});
	},

	set_background: function() {
		frappe.ui.set_user_background(frappe.boot.user.background_image, null,
			frappe.boot.user.background_style);
	},

	show_pending_notifications: function() {
		var modules_list = frappe.get_desktop_icons();
		for (var i=0, l=modules_list.length; i < l; i++) {
			var module = modules_list[i];

			var module_doctypes = frappe.boot.notification_info.module_doctypes[module.module_name];

			var sum = 0;
			if(module_doctypes) {
				if(frappe.boot.notification_info.open_count_doctype) {
					// sum all doctypes for a module
					for (var j=0, k=module_doctypes.length; j < k; j++) {
						var doctype = module_doctypes[j];
						sum += (frappe.boot.notification_info.open_count_doctype[doctype] || 0);
					}
				}
			} else if(frappe.boot.notification_info.open_count_doctype
				&& frappe.boot.notification_info.open_count_doctype[module.module_name]!=null) {
				// notification count explicitly for doctype
				sum = frappe.boot.notification_info.open_count_doctype[module.module_name];

			} else if(frappe.boot.notification_info.open_count_module
				&& frappe.boot.notification_info.open_count_module[module.module_name]!=null) {
				// notification count explicitly for module
				sum = frappe.boot.notification_info.open_count_module[module.module_name];
			}

			// if module found
			if(module._id.indexOf('/')===-1 && !module._report) {
				var notifier = $(".module-count-" + module._id);
				if(notifier.length) {
					
					if ( !frappe.desktop.wiggling ) {
						notifier.toggle(sum ? true : false);
					}
										
					var circle = notifier.find(".circle-text");
					var text = sum || '';
					if(text > 99) {
						text = '99+';
					}

					if(circle.length) {
						circle.html(text);
					} else {
						notifier.html(text);
					}
				}
			}
		}
	}
});
