import { App, Modal, Notice, getIconIds, setIcon } from 'obsidian';

const ICONS_PER_PAGE = 300;

export class IconPickerModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        modalEl.style.width = '640px';
        modalEl.style.maxWidth = '90vw';
        contentEl.empty();
        contentEl.style.padding = '16px';

        const allIcons = getIconIds().sort();

        const searchEl = contentEl.createEl('input', { type: 'text', placeholder: 'Search icons…' });
        searchEl.style.cssText = 'width:100%;margin-bottom:12px;box-sizing:border-box;';

        const hint = contentEl.createEl('p');
        hint.style.cssText = 'margin:0 0 10px;font-size:var(--font-ui-smaller);color:var(--text-muted);';
        hint.textContent = `${allIcons.length} icons — click to copy name`;

        const gridEl = contentEl.createDiv('icon-picker-grid');

        const render = (icons: string[]) => {
            gridEl.empty();
            const slice = icons.slice(0, ICONS_PER_PAGE);
            for (const id of slice) {
                const item = gridEl.createDiv('icon-picker-item');
                const iconWrap = item.createDiv('icon-picker-icon');
                setIcon(iconWrap, id);
                item.createDiv({ cls: 'icon-picker-name', text: id });
                item.addEventListener('click', () => {
                    navigator.clipboard.writeText(id);
                    new Notice(`Copied: ${id}`, 1500);
                });
            }
            if (icons.length > ICONS_PER_PAGE) {
                const more = gridEl.createEl('p');
                more.style.cssText = 'width:100%;text-align:center;color:var(--text-muted);font-size:var(--font-ui-smaller);margin-top:8px;';
                more.textContent = `Showing ${ICONS_PER_PAGE} of ${icons.length} — refine your search`;
            }
        };

        render(allIcons);

        searchEl.addEventListener('input', () => {
            const q = searchEl.value.toLowerCase().trim();
            const filtered = q ? allIcons.filter(id => id.includes(q)) : allIcons;
            hint.textContent = `${filtered.length} icons — click to copy name`;
            render(filtered);
        });

        setTimeout(() => { searchEl.focus(); }, 50);
    }

    onClose() {
        this.contentEl.empty();
    }
}
