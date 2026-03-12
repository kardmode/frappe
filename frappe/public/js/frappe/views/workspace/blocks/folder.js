import Block from "./block.js";
export default class Folder extends Block {
	static get toolbox() {
		return {
			title: "Folder",
			icon: frappe.utils.icon("folder-normal", "sm"),
		};
	}

	static get isReadOnlySupported() {
		return true;
	}

	constructor({ data, api, config, readOnly, block }) {
		super({ data, api, config, readOnly, block });
		this.col = this.data.col ? this.data.col : "2";
		this.allow_customization = !this.readOnly;
		this.options = {
			allow_sorting: this.allow_customization,
			allow_create: this.allow_customization,
			allow_delete: this.allow_customization,
			allow_hiding: false,
			allow_edit: true,
			allow_resize: true,
			min_width: 1,
		};
	}

	set_col_class(node, width) {
		if (width == 2) {
			let classes = $.grep(node.classList, function (item) {
				return item.indexOf("col-") !== 0;
			});

			node.classList = "";

			classes.forEach((cl) => {
				node.classList.add(cl);
			});

			node.classList.add("col-xs-12");
			node.classList.add("col-sm-6");
			node.classList.add("col-md-4");
			node.classList.add("col-lg-2");
			node.classList.add("col-xl-2"); // Use xl-1 for ultra small if available
			return;
		}
		super.set_col_class(node, width);
	}

	rendered() {
		super.rendered();
	}

	make(block, block_name, widget_type = block) {
		let block_data = this.data.folder_data;

		if (!block_data) {
			if (this.config.page_data[block + "s"]) {
				block_data = this.config.page_data[block + "s"].items.find((obj) => {
					return (
						frappe.utils.unescape_html(obj.label) == frappe.utils.unescape_html(__(block_name))
					);
				});
			}
		}

		if (!block_data) return false;

		this.wrapper.innerHTML = "";
		block_data.in_customize_mode = !this.readOnly;
		this.block_widget = new frappe.widget.SingleWidgetGroup({
			container: this.wrapper,
			type: widget_type,
			class_name: "",
			options: this.options,
			widgets: block_data,
			api: this.api,
			block: this.block,
		});
		this.wrapper.setAttribute(block + "_name", block_name);
		if (!this.readOnly) {
			this.block_widget.customize();
		}
		return true;
	}

	render() {
		this.wrapper = document.createElement("div");
		this.new("folder");

		if (this.data && (this.data.folder_name || this.data.folder_data)) {
			let name = this.data.folder_name || (this.data.folder_data && this.data.folder_data.label);
			let has_data = this.make("folder", name);
			if (!has_data) return;
		}

		if (!this.readOnly) {
			$(this.wrapper).find(".widget").addClass("folder edit-mode");
			this.add_settings_button();
			this.add_new_block_button();
		} else {
			$(this.wrapper).append($(`<div class="divider"></div>`));
		}
		return this.wrapper;
	}

	validate(savedData) {
		if (!savedData.folder_name) {
			return false;
		}

		return true;
	}

	save() {
		return {
			folder_name: this.wrapper.getAttribute("folder_name"),
			col: this.get_col(),
			folder_data: this.new_block_widget || this.data.folder_data,
		};
	}
}
