import Widget from "./base_widget.js";

export default class FolderWidget extends Widget {
	constructor(opts) {
		opts.icon = opts.icon || "file";
		super(opts);
	}

	get_config() {
		return {
			name: this.name,
			label: this.label,
			icon: this.icon,
			items: this.items || [],
			hidden: this.hidden,
		};
	}

	set_body() {
		this.widget.addClass("folder-widget");
		this.render_preview();
	}

	set_title() {
		// iOS style folders have label at the bottom, so we'll hide the default title
		this.title_field.empty();
	}

	render_preview() {
		this.body.empty();
		const preview_container = $(`
			<div class="folder-preview-wrapper">
				<div class="folder-preview-grid"></div>
				<div class="folder-preview-label">${__(this.label)}</div>
			</div>
		`);
		const grid = preview_container.find(".folder-preview-grid");
		const items = this.items || [];
		
		// Show up to 4 items in the preview
		items.slice(0, 4).forEach(item => {
			const icon = frappe.utils.icon(item.icon || "folder-normal", "sm");
			$(`<div class="folder-preview-icon">${icon}</div>`).appendTo(grid);
		});

		preview_container.appendTo(this.body);
	}

	setup_events() {
		this.widget.on("click", (e) => {
			if (this.in_customize_mode) return;
			e.preventDefault();
			e.stopPropagation();
			this.open_folder();
		});
	}

	open_folder() {
		if (this.folder_overlay) {
			this.folder_overlay.remove();
		}

		this.folder_overlay = $(`
			<div class="folder-expanded-overlay">
				<div class="folder-expanded-container">
					<div class="folder-header">
						<div class="folder-title">${__(this.label)}</div>
						<div class="folder-close">${frappe.utils.icon("close", "sm")}</div>
					</div>
					<div class="folder-items-grid"></div>
				</div>
			</div>
		`).appendTo(document.body);

		const grid = this.folder_overlay.find(".folder-items-grid");
		const items = this.items || [];

		items.forEach(item => {
			const $item = $(`
				<div class="folder-item">
					<div class="folder-item-icon-wrapper">
						${frappe.utils.icon(item.icon || "folder-normal", "lg")}
					</div>
					<div class="folder-item-label">${__(item.label)}</div>
				</div>
			`).appendTo(grid);

			$item.on("click", (e) => {
				e.stopPropagation();
				this.close_folder();
				if (item.route) {
					frappe.set_route(item.route);
				}
			});
		});

		this.folder_overlay.on("click", (e) => {
			if ($(e.target).hasClass("folder-expanded-overlay")) {
				this.close_folder();
			}
		});

		this.folder_overlay.find(".folder-close").on("click", () => {
			this.close_folder();
		});

		// Animate in
		requestAnimationFrame(() => {
			this.folder_overlay.addClass("opened");
		});
	}

	close_folder() {
		if (this.folder_overlay) {
			this.folder_overlay.removeClass("opened");
			setTimeout(() => {
				this.folder_overlay.remove();
				this.folder_overlay = null;
			}, 300);
		}
	}
}
