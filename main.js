document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const tagsInput = document.getElementById('tags-input');
    const saveButton = document.getElementById('save-button');
    const cancelButton = document.getElementById('cancel-edit-button');
    const promptList = document.getElementById('prompt-list');
    const tagListContainer = document.getElementById('tag-list-container');
    const existingTagsContainer = document.getElementById('existing-tags-container');
    const noTagsPlaceholder = document.getElementById('no-tags-placeholder');
    const formTitle = document.getElementById('form-title');
    const exportJsonButton = document.getElementById('export-json-button');
            const exportTxtButton = document.getElementById('export-txt-button');
            const importJsonButton = document.getElementById('import-json-button');

    let prompts = JSON.parse(localStorage.getItem('prompts')) || [];
    let editingPromptId = null;
    let activeFilterTags = new Set();

    // --- Toast通知 --- 
    function showToast(message, duration = 3000) {
        const toast = document.getElementById('toast-message');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    // --- 标签处理 ---
    function getAllUniqueTags() {
        const allTags = new Set();
        prompts.forEach(prompt => {
            prompt.tags.forEach(tag => allTags.add(tag.trim()));
        });
        return Array.from(allTags).sort();
    }

    function renderTagButtons(tags, container, clickHandler, activeTagsSet) {
        container.innerHTML = '';
        if (tags.length === 0 && container === tagListContainer) {
            noTagsPlaceholder.style.display = 'block';
            return;
        }
        if (container === tagListContainer) noTagsPlaceholder.style.display = 'none';

        tags.forEach(tag => {
            const button = document.createElement('button');
            button.textContent = tag;
            button.classList.add('tag-button');
            if (activeTagsSet && activeTagsSet.has(tag)) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => clickHandler(tag, button));
            container.appendChild(button);
        });
    }

    function updateFilterTagButtons() {
        const uniqueTags = getAllUniqueTags();
        renderTagButtons(uniqueTags, tagListContainer, toggleFilterTag, activeFilterTags);
    }
    
    function updateExistingTagsForInput() {
        const uniqueTags = getAllUniqueTags();
        renderTagButtons(uniqueTags, existingTagsContainer, addTagToInput, null);
    }

    function addTagToInput(tag) {
        const currentTags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        if (!currentTags.includes(tag)) {
            currentTags.push(tag);
            tagsInput.value = currentTags.join(', ');
        }
    }

    function toggleFilterTag(tag, button) {
        if (activeFilterTags.has(tag)) {
            activeFilterTags.delete(tag);
            button.classList.remove('active');
        } else {
            activeFilterTags.add(tag);
            button.classList.add('active');
        }
        renderPrompts();
    }

    // --- Prompt渲染 --- 
    function renderPrompts() {
        promptList.innerHTML = '';
        const filteredPrompts = prompts.filter(prompt => {
            if (activeFilterTags.size === 0) return true;
            return prompt.tags.some(tag => activeFilterTags.has(tag.trim()));
        });

        if (filteredPrompts.length === 0) {
            const li = document.createElement('li');
            li.textContent = activeFilterTags.size > 0 ? '没有匹配当前筛选的Prompt。' : '还没有保存任何Prompt。';
            // li.classList.add('text-slate-500', 'italic', 'p-4', 'text-center'); // 移除旧样式
            li.classList.add('empty-state-placeholder'); // 添加新样式
            promptList.appendChild(li);
            return;
        }

        filteredPrompts.forEach((prompt, index) => {
            const li = document.createElement('li');
            li.classList.add('prompt-item');
            li.dataset.id = prompt.id;

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('prompt-content');
            contentDiv.textContent = prompt.text;

            const tagsDiv = document.createElement('div');
            tagsDiv.classList.add('prompt-tags');
            prompt.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.classList.add('prompt-tag');
                tagSpan.textContent = tag.trim();
                tagsDiv.appendChild(tagSpan);
            });

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('prompt-item-actions'); // 修改类名以匹配CSS

            const copyButton = createActionButton('复制', 
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
                () => copyPrompt(prompt.text));
            
            const oneClickCopyButton = createActionButton('一键复制', 
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>',
                () => copyPrompt(prompt.text));

            const editButton = createActionButton('编辑', 
                '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>',
                () => editPrompt(prompt.id));

            const deleteButton = createActionButton('删除', 
                '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>',
                () => deletePrompt(prompt.id));

            // 创建 footer 容器
            const footerDiv = document.createElement('div');
            footerDiv.classList.add('prompt-item-footer');

            // 将 tagsDiv 和 actionsDiv 放入 footerDiv
            // 注意：确保 tagsDiv 和 actionsDiv 在此之前已正确创建和填充
            footerDiv.appendChild(tagsDiv); // 标签在左
            footerDiv.appendChild(actionsDiv); // 按钮在右

            actionsDiv.append(copyButton, editButton, deleteButton); // 移除了 oneClickCopyButton
            li.append(contentDiv, footerDiv); // 将 contentDiv 和 footerDiv 添加到 li
            promptList.appendChild(li);
        });
    }

    function createActionButton(title, svgIcon, onClick) {
        const button = document.createElement('button');
        button.classList.add('icon-btn');
        button.title = title;
        button.innerHTML = svgIcon;
        button.addEventListener('click', onClick);
        return button;
    }

    // --- Prompt操作 --- 
    function savePrompt() {
        const text = promptInput.value.trim();
        const tagsArray = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);

        if (!text) {
            showToast('Prompt内容不能为空！', 2000);
            return;
        }

        if (editingPromptId) {
            // 更新
            const promptIndex = prompts.findIndex(p => p.id === editingPromptId);
            if (promptIndex > -1) {
                prompts[promptIndex].text = text;
                prompts[promptIndex].tags = tagsArray;
                showToast('Prompt已更新！');
            }
            editingPromptId = null;
            formTitle.textContent = '添加新的Prompt';
            saveButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>保存Prompt</span>';
            cancelButton.classList.add('hidden');
        } else {
            // 新增
            const newPrompt = {
                id: Date.now(), // 使用时间戳作为简单ID
                text: text,
                tags: tagsArray
            };
            prompts.push(newPrompt);
            showToast('Prompt已保存！');
        }

        localStorage.setItem('prompts', JSON.stringify(prompts));
        clearInputFields();
        renderPrompts();
        updateFilterTagButtons();
        updateExistingTagsForInput();
    }

    function editPrompt(id) {
        const promptToEdit = prompts.find(p => p.id === id);
        if (promptToEdit) {
            promptInput.value = promptToEdit.text;
            tagsInput.value = promptToEdit.tags.join(', ');
            editingPromptId = id;
            formTitle.textContent = '编辑Prompt';
            saveButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>更新Prompt</span>';
            cancelButton.classList.remove('hidden');
            promptInput.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function cancelEdit() {
        editingPromptId = null;
        clearInputFields();
        formTitle.textContent = '添加新的Prompt';
        saveButton.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>保存Prompt</span>';
        cancelButton.classList.add('hidden');
    }

    function deletePrompt(id) {
        if (confirm('确定要删除这个Prompt吗？')) {
            prompts = prompts.filter(p => p.id !== id);
            localStorage.setItem('prompts', JSON.stringify(prompts));
            renderPrompts();
            updateFilterTagButtons();
            updateExistingTagsForInput();
            showToast('Prompt已删除。');
            if (editingPromptId === id) cancelEdit(); // 如果正在编辑的被删除了，取消编辑状态
        }
    }

    function copyPrompt(text) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Prompt已复制到剪贴板！'))
            .catch(err => {
                console.error('复制失败: ', err);
                showToast('复制失败，请手动复制。', 3000);
            });
    }

    function clearInputFields() {
        promptInput.value = '';
        tagsInput.value = '';
    }

    // --- 数据导出 ---
    function exportData(format) {
        if (prompts.length === 0) {
            showToast('没有数据可以导出。', 2000);
            return;
        }

        let dataStr, mimeType, fileName;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        if (format === 'json') {
            dataStr = JSON.stringify(prompts, null, 2);
            mimeType = 'application/json';
            fileName = `prompts_${timestamp}.json`;
        } else if (format === 'txt') {
            dataStr = prompts.map(p => {
                return `标签: ${p.tags.join(', ')}\nPrompt:\n${p.text}\n--------------------`;
            }).join('\n\n');
            mimeType = 'text/plain';
            fileName = `prompts_${timestamp}.txt`;
        }

        const blob = new Blob([dataStr], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`数据已导出为 ${fileName}`);
    }

    // --- 事件监听 --- 
    saveButton.addEventListener('click', savePrompt);
    cancelButton.addEventListener('click', cancelEdit);
    exportJsonButton.addEventListener('click', () => exportData('json'));
    exportTxtButton.addEventListener('click', () => exportData('txt'));
    importJsonButton.addEventListener('click', importDataFromJson);

    // --- 初始化 --- 
    renderPrompts();
    updateFilterTagButtons();
    updateExistingTagsForInput();

    // --- 数据导入 ---
    function importDataFromJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedPrompts = JSON.parse(event.target.result);
                    if (Array.isArray(importedPrompts) && importedPrompts.every(p => typeof p.text === 'string' && Array.isArray(p.tags))) {
                        // 简单的合并策略：直接追加，并为可能重复的ID生成新ID
                        const existingIds = new Set(prompts.map(p => p.id));
                        let newPromptsAdded = 0;
                        importedPrompts.forEach(importedPrompt => {
                            let newId = importedPrompt.id && !existingIds.has(importedPrompt.id) ? importedPrompt.id : Date.now() + Math.random();
                            while(existingIds.has(newId)) { //确保ID唯一
                                newId = Date.now() + Math.random();
                            }
                            prompts.push({ ...importedPrompt, id: newId });
                            existingIds.add(newId);
                            newPromptsAdded++;
                        });
                        localStorage.setItem('prompts', JSON.stringify(prompts));
                        renderPrompts();
                        updateFilterTagButtons();
                        updateExistingTagsForInput();
                        showToast(`${newPromptsAdded}个Prompt已成功导入！`);
                    } else {
                        showToast('导入失败：JSON文件格式不正确。', 3000);
                    }
                } catch (error) {
                    console.error('导入JSON错误:', error);
                    showToast('导入失败：无法解析JSON文件。', 3000);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
});