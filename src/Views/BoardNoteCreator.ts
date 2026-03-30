import Services from 'Base/Services';
import { TFile, TFolder } from 'obsidian';
import { InternalFileManager, InternalWorkspace } from 'Types/Internal';
import { getPropertyKeyFromId } from 'Utils';
import { EMPTY_GROUP_VALUE } from './BoardViewRenderer';
import { BoardOptions } from './OptionsExtractor';

export class BoardNoteCreator {
    private pendingNote: {
        groupValue: unknown;
        subGroupValue?: unknown;
        groupPropertyId?: string | null;
        subGroupPropertyId?: string | null;
    } | null = null;

    handleNewNoteClick(groupValue: unknown, subGroupValue?: unknown, groupPropertyId?: string | null, subGroupPropertyId?: string | null, options?: BoardOptions): void {
        const folder = options?.newNoteFolder || '';
        const template = options?.newNoteTemplate || '';

        if (folder || template) {
            void this.createNote(groupValue, subGroupValue, groupPropertyId, subGroupPropertyId, folder, template, options?.newNoteOpen ?? false);
            return;
        }

        // Default behavior: trigger native Bases new button
        this.pendingNote = { groupValue, subGroupValue, groupPropertyId, subGroupPropertyId };
        const newButton = document.querySelector('.bases-toolbar-new-item-menu .text-icon-button');
        if (newButton instanceof HTMLElement) {
            newButton.click();
        } else {
            console.warn('[BoardNoteCreator] New button not found');
            this.pendingNote = null;
        }
    }

    async processPendingNote(): Promise<void> {
        if (!this.pendingNote) return;

        try {
            const file = (Services.app.workspace as InternalWorkspace)._activeEditor?.file;
            if (file instanceof TFile) {
                await this.assignGroupValues(file, this.pendingNote.groupValue, this.pendingNote.subGroupValue, this.pendingNote.groupPropertyId, this.pendingNote.subGroupPropertyId);
            }
        } finally {
            this.pendingNote = null;
        }
    }

    private async createNote(groupValue: unknown, subGroupValue: unknown, groupPropertyId: string | null | undefined, subGroupPropertyId: string | null | undefined, folderPath: string, templatePath: string, openAfterCreation = false): Promise<void> {
        const app = Services.app;
        const fileManager = app.fileManager as InternalFileManager;
        const folder = this.resolveFolder(folderPath);
        let newFile: TFile | null = null;

        try {
            // Try Templater if template is set
            if (templatePath) {
                const templateFile = app.vault.getFileByPath(templatePath);
                if (templateFile) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const tp = (app as any).plugins?.plugins?.['templater-obsidian'];
                    if (tp?.templater && typeof tp.templater.create_new_note_from_template === 'function') {
                        newFile = await tp.templater.create_new_note_from_template(templateFile, folder, undefined, false) as TFile;
                    } else {
                        // Fallback: create file and copy template content
                        const content = await app.vault.read(templateFile);
                        newFile = await fileManager.createNewMarkdownFile(folder, 'Untitled');
                        await app.vault.modify(newFile, content);
                    }
                }
            }

            // No template or template file not found — create blank file
            if (!newFile) {
                newFile = await fileManager.createNewMarkdownFile(folder, 'Untitled');
            }

            if (openAfterCreation) {
                await app.workspace.openLinkText(newFile.path, '', true);
            }
            await this.assignGroupValues(newFile, groupValue, subGroupValue, groupPropertyId, subGroupPropertyId);
        } catch (e) {
            console.error('[BoardNoteCreator] Failed to create note', e);
        }
    }

    private resolveFolder(folderPath: string): TFolder {
        if (folderPath) {
            const folder = Services.app.vault.getFolderByPath(folderPath);
            if (folder) return folder;
        }
        return Services.app.vault.getRoot();
    }

    private async assignGroupValues(file: TFile, groupValue: unknown, subGroupValue?: unknown, groupPropertyId?: string | null, subGroupPropertyId?: string | null): Promise<void> {
        if (groupPropertyId && groupValue !== null && groupValue !== EMPTY_GROUP_VALUE) {
            const groupPropertyKey = getPropertyKeyFromId(groupPropertyId);
            await Services.propertyManager.updateFrontmatter(file, groupPropertyKey, groupValue);
        }

        if (subGroupPropertyId && subGroupValue !== undefined && subGroupValue !== null && subGroupValue !== EMPTY_GROUP_VALUE) {
            const subGroupPropertyKey = getPropertyKeyFromId(subGroupPropertyId);
            await Services.propertyManager.updateFrontmatter(file, subGroupPropertyKey, subGroupValue);
        }
    }
}
