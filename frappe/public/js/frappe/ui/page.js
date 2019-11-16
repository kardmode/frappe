// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

/**
 * Make a standard page layout with a toolbar and title
 *
 * @param {Object} opts
 *
 * @param {string} opts.parent [HTMLElement] Parent element
 * @param {boolean} opts.single_column Whether to include sidebar
 * @param {string} [opts.title] Page title
 * @param {Object} [opts.make_page]
 *
 * @returns {frappe.ui.Page}
 */

/**
 * @typedef {Object} frappe.ui.Page
 */


frappe.ui.make_app_page = function(opts) {
	opts.parent.page = new frappe.ui.Page(opts);
	return opts.parent.page;
}

frappe.ui.pages = {};

frappe.ui.Page = Class.extend({
	init: function(opts) {
		$.extend(this, opts);

		this.set_document_title = true;
		this.buttons = {};
		this.fields_dict = {};
		this.views = {};

		this.make();
		frappe.ui.pages[frappe.get_route_str()] = this;
	},

	make: function() {
		this.wrapper = $(this.parent);
		this.add_main_section();
	},

	get_empty_state: function(title, message, primary_action) {
		let $empty_state = $(`<div class="page-card-container">
			<div class="page-card">
				<div class="page-card-head">
					<span class="indicator blue">
						${title}</span>
				</div>
				<p>${message}</p>
				<div>
					<button class="btn btn-primary btn-sm">${primary_action}</button>
				</div>
			</div>
		</div>`);

		return $empty_state;
	},

	load_lib: function (callback) {
		frappe.require(this.required_libs, callback);
	},

	add_main_section: function() {
		$(frappe.render_template("page", {})).appendTo(this.wrapper);
		
		var test_page_name = frappe.get_route_str();
		this.is_module_page = false;
		if(this.single_column) {
			// nesting under col-sm-12 for consistency
			this.add_view("main", '<div class="row layout-main">\
					<div class="always-compact layout-side-section layout-left"></div>\
					<div class="layout-side-section layout-right"></div>\
					<div class="col-md-12 layout-main-section-wrapper">\
						<div class="layout-main-section"></div>\
						<div class="layout-footer hide"></div>\
					</div>\
					<div class="close-sidebar" style="display: none;"></div>\
				</div>');
		} else {
			
			if(test_page_name.includes("Form/")){
				this.add_view("main", '<div class="row layout-main">\
				<div class="always-compact layout-side-section layout-left"></div>\
				<div class="layout-side-section layout-right"></div>\
				<div class="col-md-12 layout-main-section-wrapper">\
					<div class="layout-main-section"></div>\
					<div class="layout-footer hide"></div>\
				</div>\
				<div class="close-sidebar" style="display: none;"></div>\
			</div>');
			
				this.wrapper.find(".toggle-rightbar").removeClass('hide');
			
				
			}
			else if (test_page_name.includes("List/")){
				this.add_view("main", '<div class="row layout-main">\
				<div class="always-compact layout-side-section layout-left"></div>\
				<div class="layout-side-section layout-right"></div>\
				<div class="col-md-12 layout-main-section-wrapper">\
					<div class="layout-main-section"></div>\
					<div class="layout-footer hide"></div>\
				</div>\
				<div class="close-sidebar" style="display: none;"></div>\
			</div>');
			
				this.wrapper.find(".toggle-rightbar").removeClass('hide');
				// this.wrapper.find(".toggle-sidebar").removeClass('hide');
			}
			else if (test_page_name.includes("modules/")){
				
				this.is_module_page = true;
				
				this.add_view("main", '<div class="row layout-main">\
				<div class="layout-side-section layout-right"></div>\
				<div class="col-md-3 layout-side-section layout-left"></div>\
				<div class="col-md-9 layout-main-section-wrapper">\
					<div class="layout-main-section"></div>\
					<div class="layout-footer hide"></div>\
				</div>\
				<div class="close-sidebar" style="display: none;"></div>\
			</div>');
			}
			else{
				this.add_view("main", '<div class="row layout-main">\
				<div class="col-md-2 layout-side-section layout-left"></div>\
				<div class="col-md-10 layout-main-section-wrapper">\
					<div class="layout-main-section"></div>\
					<div class="layout-footer hide"></div>\
				</div>\
				<div class="close-sidebar" style="display: none;"></div>\
			</div>');
				
			}
			
		}

		this.setup_page();
	},

	setup_page: function() {
		this.$title_area = this.wrapper.find("h1");

		this.$sub_title_area = this.wrapper.find("h6");

		if(this.set_document_title!==undefined)
			this.set_document_title = this.set_document_title;

		if(this.title)
			this.set_title(this.title);

		if(this.icon)
			this.get_main_icon(this.icon);

		this.body = this.main = this.wrapper.find(".layout-main-section");
		this.left_sidebar = this.wrapper.find(".layout-side-section.layout-left");
		this.sidebar = this.wrapper.find(".layout-side-section.layout-right");
		this.footer = this.wrapper.find(".layout-footer");
		this.indicator = this.wrapper.find(".indicator");

		this.page_actions = this.wrapper.find(".page-actions");

		this.btn_primary = this.page_actions.find(".primary-action");
		this.btn_secondary = this.page_actions.find(".btn-secondary");

		this.menu = this.page_actions.find(".menu-btn-group .dropdown-menu");
		this.menu_btn_group = this.page_actions.find(".menu-btn-group");

		this.actions = this.page_actions.find(".actions-btn-group .dropdown-menu");
		this.actions_btn_group = this.page_actions.find(".actions-btn-group");

		this.page_form = $('<div class="page-form row hide"></div>').prependTo(this.main);
		this.inner_toolbar = $('<div class="form-inner-toolbar hide"></div>').prependTo(this.main);
		
		this.setup_rightbar();
		this.setup_leftbar();
		
		if(this.is_module_page !== true)
		{
			this.setup_module_sidebar();
		}
		else
		{
			
			
		}
		
		
		
		this.icon_group = this.page_actions.find(".page-icon-group");

		
		if(this.make_page) {
			this.make_page();
		}
	},
	
	setup_module_sidebar: function() {
		
		this.get_page_modules = () => {
		return frappe.get_desktop_icons(true)
			.filter(d => d.type==='module' && !d.blocked)
			.sort((a, b) => { return (a._label > b._label) ? 1 : -1; });
		};

		let get_module_sidebar_item = (item) => `<li class="strong module-sidebar-item">
			<a class="module-link`+ (item.hide_in_module_sidebar ? ' hide':'')+`" data-name="${item.module_name}" href="#modules/${item.module_name}">
				<i class="fa fa-chevron-right pull-right" style="display: none;"></i>
							<span class="sidebar-icon" style="background-color: ${item.color}"><i class="${item.icon}"></i></span>
				<span class="ellipsis">${item._label}</span>
			</a>
		</li>`;

		let get_sidebar_html = () => {
			let sidebar_items_html = this.get_page_modules()
				.map(get_module_sidebar_item.bind(this)).join("");
			
			
			
			let sidebar_home_html = `<li class="strong module-sidebar-item">
				<a class="module-link" href="#">
				<span class="sidebar-icon"><i class="octicon octicon-home"></i></span>
				<span class="ellipsis">Home</span>
				</a></li>`;
				
			return `<ul class="module-sidebar-nav overlay-sidebar nav nav-pills nav-stacked">
				${sidebar_home_html}
				${sidebar_items_html}
				<li class="divider"></li>
			</ul>`;
		};

		// render sidebar
		this.left_sidebar.html(get_sidebar_html());
		
	},
	
	setup_leftbar: function () {
		var header = $('header');
		header.find(".toggle-sidebar").on("click", function () {
			var layout_side_section = $('.layout-side-section.layout-left');
			var overlay_sidebar = layout_side_section.find('.overlay-sidebar');

			overlay_sidebar.addClass('opened');
			overlay_sidebar.find('.reports-dropdown')
				.removeClass('dropdown-menu')
				.addClass('list-unstyled');
			overlay_sidebar.find('.dropdown-toggle')
				.addClass('text-muted').find('.caret')
				.addClass('hidden-xs hidden-sm');
			
			var close_sidebar_div = $('.close-sidebar');
			var fadespeed = 50;
			if (close_sidebar_div.length !== 0)
			{
				close_sidebar_div.hide().fadeIn(fadespeed);
			}
			else{
				//$('<div class="close-sidebar">').hide().appendTo(layout_side_section).fadeIn(fadespeed);
			}
			

			var scroll_container = $('html');
			scroll_container.css("overflow-y", "hidden");

			close_sidebar_div.on('click', close_sidebar);
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
	
	setup_rightbar: function() {
		this.custom_btn_group = this.page_actions.find(".toggle-rightbar");

		this.custom_btn_group.on("click", function () {

			var layout_side_section = $('.layout-side-section.layout-right');
			var overlay_sidebar = layout_side_section.find('.overlay-rightbar');

			overlay_sidebar.addClass('opened');
			overlay_sidebar.find('.reports-dropdown')
				.removeClass('dropdown-menu')
				.addClass('list-unstyled');
			overlay_sidebar.find('.kanban-dropdown')
				.removeClass('dropdown-menu')
				.addClass('list-unstyled');
			overlay_sidebar.find('.dropdown-toggle')
				.addClass('text-muted').find('.caret')
				.addClass('hidden-xs hidden-sm');

			var close_sidebar_div = $('.close-sidebar');
			var fadespeed = 50;
			if (close_sidebar_div.length !== 0)
			{
				close_sidebar_div.hide().fadeIn(fadespeed);
			}
			else{
				//$('<div class="close-sidebar">').hide().appendTo(layout_side_section).fadeIn(fadespeed);
			}
			

			var scroll_container = $('html');
			scroll_container.css("overflow-y", "hidden");

			close_sidebar_div.on('click', close_sidebar);
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
					overlay_sidebar.find('.kanban-dropdown')
						.addClass('dropdown-menu');
						
				});
			}
		});
	},
	
	add_dropdown_menu:function(name) {
		var lower_case = name.toLowerCase();
		var html = `<div class="btn-group ${lower_case}-btn-group">
						<button type="button" class="btn btn-default btn-sm dropdown-toggle"
								data-toggle="dropdown" aria-expanded="false">
						<span class="hidden-xs">
							<span class="${lower_case}-btn-group-label">${name}</span>
							<span class="caret"></span></span>
						<span class="visible-xs"><i class="octicon octicon-triangle-down"></i></span>
						</button>
						<ul class="dropdown-menu" role="${lower_case}">
						</ul>
				</div>`
		return html;
		
	},

	set_indicator: function(label, color) {
		this.clear_indicator().removeClass("hide").html(`<span class='hidden-xs'>${label}</span>`).addClass(color);
	},
	
	add_action_dropdown_btn: function(icon, label,parent_label, href ) {
		
		var lower_case = parent_label.toLowerCase();
		var $group = this.icon_group.find('.btn-group[data-label="'+lower_case+'"]');
		if(!$group.length) {
			$group = $('<div class="btn-group" data-label="'+lower_case+'">\
				<button type="button" class="btn btn-default dropdown-toggle btn-sm" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\
				<i class="'+icon+'"></i><span class="hidden-xs ">' + parent_label + '</span></button>\
				<ul class="dropdown-menu" style="margin-top: -8px;"></ul></div>').appendTo(this.icon_group);
		}
		
		if(!$group.length) {
			var $group_ul = $group.find(".dropdown-menu");

		
		
			this.icon_group.removeClass("hide")
			this.add_dropdown_item_href(label,'#'+href, true, $group_ul);
		
		}
		
	
	},
	
	add_action_btn: function(icon,label, click ) {
		var style = '';
		if(icon)
			style = 'margin-left:5px;';
		var lower_case = label.toLowerCase();
		return $('<a class="btn btn-default btn-sm text-muted no-decoration"><i class="' + icon + '"></i><span style="'+style+'" class="hidden-xs">' + label + '</span></a>')
			.appendTo(this.icon_group.removeClass("hide"))
			.click(click);
	
	},

	add_action_icon: function(icon, click) {
		
		return $('<a class="btn btn-default btn-sm text-muted no-decoration"><i class="'+icon+'"></i></a>')
			.appendTo(this.icon_group.removeClass("hide"))
			.click(click);
	},

	clear_indicator: function() {
		return this.indicator.removeClass().addClass("indicator hide");
	},

	get_icon_label: function(icon, label) {
		var tests = ["Refresh", "Submit", "New", "Delete","Save", "Edit", "Update"];
		
		if(tests.includes(label))
		{
			return '<i class="' + icon + '"></i><span class="hide">' + label + '</span>';
		}
		else
			return '<i class="visible-xs ' + icon + '"></i><span class="hidden-xs">' + label + '</span>';
		
	},

	set_action: function(btn, opts) {
		let me = this;
		
		if(opts.label === "Save")
		{
			btn.addClass("mrp_btn_not_saved")
		}
		
		if (opts.icon) {
			opts.label = this.get_icon_label(opts.icon, opts.label);
		}

		this.clear_action_of(btn);

		btn.removeClass("hide")
			.prop("disabled", false)
			.html(opts.label)
			.on("click", function() {
				let response = opts.click.apply(this);
				me.btn_disable_enable(btn, response);
			});
			
		

		if (opts.working_label) {
			btn.attr("data-working-label", opts.working_label);
		}
	},

	set_primary_action: function(label, click, icon, working_label) {
		this.set_action(this.btn_primary, {
			label: label,
			click: click,
			icon: icon,
			working_label: working_label
		});

		return this.btn_primary;
	},

	set_secondary_action: function(label, click, icon, working_label) {
		this.set_action(this.btn_secondary, {
			label: label,
			click: click,
			icon: icon,
			working_label: working_label
		});

		return this.btn_secondary;
	},

	clear_action_of: function(btn) {
		btn.addClass("hide").unbind("click").removeAttr("data-working-label");
	},

	clear_primary_action: function() {
		this.clear_action_of(this.btn_primary);
	},

	clear_secondary_action: function() {
		this.clear_action_of(this.btn_secondary);
	},

	clear_actions: function() {
		this.clear_primary_action();
		this.clear_secondary_action();
	},

	clear_icons: function() {
		this.icon_group.addClass("hide").empty();
	},
	
	mrp_update_primary_action: function(is_dirty) {
		
		
		if(is_dirty) {
			this.btn_primary.addClass("mrp_is_dirty");
		}
		else
		{
			this.btn_primary.removeClass("mrp_is_dirty");
		}		

		
	},

	//--- Menu --//

	add_menu_item: function(label, click, standard) {
		return this.add_dropdown_item(label, click, standard, this.menu);
	},

	clear_menu: function() {
		this.clear_btn_group(this.menu);
	},

	show_menu: function() {
		this.menu_btn_group.removeClass("hide");
	},

	hide_menu: function() {
		this.menu_btn_group.addClass("hide");
	},

	show_icon_group: function() {
		this.icon_group.removeClass("hide");
	},

	hide_icon_group: function() {
		this.icon_group.addClass("hide");
	},

	//--- Actions (workflow) --//

	add_action_item: function(label, click, standard) {
		return this.add_dropdown_item(label, click, standard, this.actions);
	},

	clear_actions_menu: function() {
		this.clear_btn_group(this.actions);
	},

	//-- Generic --//
	/*
	* Add label to given drop down menu. If label, is already contained in the drop
	* down menu, it will be ignored.
	* @param {string} label - Text for the drop down menu
	* @param {function} click - function to be called when `label` is clicked
	* @param {Boolean} standard
	* @param {object} parent - DOM object representing the parent of the drop down item lists
	*/
	add_dropdown_item_href: function(label, href, standard, parent) {
		let item_selector = 'li > a.grey-link';

		parent.parent().removeClass("hide");

		var $li = $('<li><a class="grey-link" href="'+ href +'">'+ label +'</a></li>');
		//var $link = $li.find("a").on("click", click);

		if (this.is_in_group_button_dropdown(parent, item_selector, label)) return;

		if(standard===true) {
			$li.appendTo(parent);
		} else {
			this.divider = parent.find(".divider");
			if(!this.divider.length) {
				this.divider = $('<li class="divider user-action"></li>').prependTo(parent);
			}
			$li.addClass("user-action").insertBefore(this.divider);
		}

		//return $link;
	},
	

	/*
	* Add label to given drop down menu. If label, is already contained in the drop
	* down menu, it will be ignored.
	* @param {string} label - Text for the drop down menu
	* @param {function} click - function to be called when `label` is clicked
	* @param {Boolean} standard
	* @param {object} parent - DOM object representing the parent of the drop down item lists
	*/
	add_dropdown_item: function(label, click, standard, parent) {
		let item_selector = 'li > a.grey-link';

		parent.parent().removeClass("hide");

		var $li = $('<li><a class="grey-link">'+ label +'</a></li>'),
			$link = $li.find("a").on("click", click);

		if (this.is_in_group_button_dropdown(parent, item_selector, label)) return;

		if(standard===true) {
			$li.appendTo(parent);
		} else {
			this.divider = parent.find(".divider");
			if(!this.divider.length) {
				this.divider = $('<li class="divider user-action"></li>').prependTo(parent);
			}
			$li.addClass("user-action").insertBefore(this.divider);
		}

		return $link;
	},

	/*
	* Check if there already exists a button with a specified label in a specified button group
	* @param {object} parent - This should be the `ul` of the button group.
	* @param {string} selector - CSS Selector of the button to be searched for. By default, it is `li`.
	* @param {string} label - Label of the button
	*/
	is_in_group_button_dropdown: function(parent, selector, label){
		if (!selector) selector = 'li';

		if (!label || !parent) return false;

		const result = $(parent).find(`${selector}:contains('${label}')`)
			.filter(function() {
				return $(this).text() === label;
			});
		return result.length > 0;
	},

	clear_btn_group: function(parent) {
		parent.empty();
		parent.parent().addClass("hide");
	},

	add_divider: function() {
		return $('<li class="divider"></li>').appendTo(this.menu);
	},

	get_or_add_inner_group_button: function(label) {
		var $group = this.inner_toolbar.find('.btn-group[data-label="'+label+'"]');
		if(!$group.length) {
			$group = $('<div class="btn-group" data-label="'+label+'" style="margin-left: 10px;">\
				<button type="button" class="btn btn-default dropdown-toggle btn-xs" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\
				'+label+' <span class="caret"></span></button>\
				<ul class="dropdown-menu" style="margin-top: -8px;"></ul></div>').appendTo(this.inner_toolbar);
		}
		return $group;
	},

	get_inner_group_button: function(label) {
		return this.inner_toolbar.find('.btn-group[data-label="'+label+'"]');
	},

	set_inner_btn_group_as_primary: function(label) {
		this.get_or_add_inner_group_button(label).find("button").removeClass("btn-default").addClass("btn-primary");
	},

	btn_disable_enable: function(btn, response) {
		if (response && response.then) {
			btn.prop('disabled', true);
			response.then(() => {
				btn.prop('disabled', false);
			})
		} else if (response && response.always) {
			btn.prop('disabled', true);
			response.always(() => {
				btn.prop('disabled', false);
			});
		}
	},

	/*
	* Add button to button group. If there exists another button with the same label,
	* `add_inner_button` will not add the new button to the button group even if the callback
	* function is different.
	*
	* @param {string} label - Label of the button to be added to the group
	* @param {object} action - function to be called when button is clicked
	* @param {string} group - Label of the group button
	*/
	add_inner_button: function(label, action, group) {
		var me = this;
		let _action = function() {
			let btn = $(this);
			let response = action();
			me.btn_disable_enable(btn, response);
		};
		if(group) {
			var $group = this.get_or_add_inner_group_button(group);
			$(this.inner_toolbar).removeClass("hide");

			if (!this.is_in_group_button_dropdown($group.find(".dropdown-menu"), 'li', label)) {
				return $('<li><a>'+label+'</a></li>')
					.on('click', _action)
					.appendTo($group.find(".dropdown-menu"));
			}

		} else {
			return $('<button class="btn btn-default btn-xs" style="margin-left: 10px;">'+__(label)+'</btn>')
				.on("click", _action)
				.appendTo(this.inner_toolbar.removeClass("hide"));
		}
	},

	remove_inner_button: function(label, group) {
		if (typeof label === 'string') {
			label = [label];
		}
		// translate
		label = label.map(l => __(l));

		if (group) {
			var $group = this.get_inner_group_button(__(group));
			if($group.length) {
				$group.find('.dropdown-menu li a')
					.filter((i, btn) => label.includes($(btn).text()))
					.remove();
			}
			if ($group.find('.dropdown-menu li a').length === 0) $group.remove();
		} else {

			this.inner_toolbar.find('button')
				.filter((i, btn) =>  label.includes($(btn).text()))
				.remove();
		}
	},

	clear_inner_toolbar: function() {
		this.inner_toolbar.empty().addClass("hide");
	},

	//-- Sidebar --//

	add_sidebar_item: function(label, action, insert_after, prepend) {
		var parent = this.sidebar.find(".sidebar-menu.standard-actions");
		var li = $('<li>');
		var link = $('<a>').html(label).on("click", action).appendTo(li);

		if(insert_after) {
			li.insertAfter(parent.find(insert_after));
		} else {
			if(prepend) {
				li.prependTo(parent);
			} else {
				li.appendTo(parent);
			}
		}
		return link;
	},

	//---//

	clear_user_actions: function() {
		this.menu.find(".user-action").remove();
	},

	// page::title
	get_title_area: function() {
		return this.$title_area;
	},

	set_title: function(txt, icon) {
		if(!txt) txt = "";

		// strip html
		txt = strip_html(txt);
		this.title = txt;

		frappe.utils.set_title(txt);
		if(icon) {
			txt = '<span class="'+ icon +' text-muted" style="font-size: inherit;"></span> ' + txt;
		}
		this.$title_area.find(".title-text").html(txt);
	},

	set_title_sub: function(txt) {
		// strip icon
		this.$sub_title_area.html(txt).toggleClass("hide", !!!txt);
	},

	get_main_icon: function(icon) {
		return this.$title_area.find(".title-icon")
			.html('<i class="'+icon+' fa-fw"></i> ')
			.toggle(true);
	},

	add_help_button: function(txt) {
		//
	},

	add_button: function(label, click, icon, is_title) {
		//
	},

	add_dropdown_button: function(parent, label, click, icon) {
		frappe.ui.toolbar.add_dropdown_button(parent, label, click, icon);
	},

	// page::form
	add_label: function(label) {
		this.show_form();
		return $("<label class='col-md-1 page-only-label'>"+label+" </label>")
			.appendTo(this.page_form);
	},
	add_select: function(label, options) {
		var field = this.add_field({label:label, fieldtype:"Select"});
		return field.$wrapper.find("select").empty().add_options(options);
	},
	add_data: function(label) {
		var field = this.add_field({label: label, fieldtype: "Data"});
		return field.$wrapper.find("input").attr("placeholder", label);
	},
	add_date: function(label, date) {
		var field = this.add_field({label: label, fieldtype: "Date", "default": date});
		return field.$wrapper.find("input").attr("placeholder", label);
	},
	add_check: function(label) {
		return $("<div class='checkbox'><label><input type='checkbox'>" + label + "</label></div>")
			.appendTo(this.page_form)
			.find("input");
	},
	add_break: function() {
		// add further fields in the next line
		this.page_form.append('<div class="clearfix invisible-xs"></div>');
	},
	add_field: function(df) {
		this.show_form();
		var f = frappe.ui.form.make_control({
			df: df,
			parent: this.page_form,
			only_input: df.fieldtype=="Check" ? false : true,
		})
		f.refresh();
		$(f.wrapper)
			.addClass('col-md-2')
			.attr("title", __(df.label)).tooltip();

		// html fields in toolbar are only for display
		if (df.fieldtype=='HTML') {
			return;
		}

		// hidden fields dont have $input
		if (!f.$input) f.make_input();

		f.$input.addClass("input-sm").attr("placeholder", __(df.label));

		if(df.fieldtype==="Check") {
			$(f.wrapper).find(":first-child")
				.removeClass("col-md-offset-4 col-md-8");
		}

		if(df.fieldtype=="Button") {
			$(f.wrapper).find(".page-control-label").html("&nbsp;")
			f.$input.addClass("btn-sm").css({"width": "100%", "margin-top": "-1px"});
		}

		if(df["default"])
			f.set_input(df["default"])
		this.fields_dict[df.fieldname || df.label] = f;
		return f;
	},
	show_form: function() {
		this.page_form.removeClass("hide");
	},
	get_form_values: function() {
		var values = {};
		this.page_form.fields_dict.forEach(function(field, key) {
			values[key] = field.get_value();
		});
		return values;
	},
	add_view: function(name, html) {
		let element = html;
		if(typeof(html) === "string") {
			element = $(html);
		}
		this.views[name] = element.appendTo($(this.wrapper).find(".page-content"));
		if(!this.current_view) {
			this.current_view = this.views[name];
		} else {
			this.views[name].toggle(false);
		}
		return this.views[name];
	},
	set_view: function(name) {
		if(this.current_view_name===name)
			return;
		this.current_view && this.current_view.toggle(false);
		this.current_view = this.views[name];

		this.previous_view_name = this.current_view_name;
		this.current_view_name = name;

		this.views[name].toggle(true);

		this.wrapper.trigger('view-change');
	},
});
