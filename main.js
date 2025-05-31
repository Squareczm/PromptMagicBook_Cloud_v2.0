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
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search');

    let prompts = JSON.parse(localStorage.getItem('prompts')) || [];
    let editingPromptId = null;
    let activeFilterTags = new Set();
    let searchQuery = '';

    // 兼容旧数据：为没有copyCount的prompt添加copyCount字段
    function migrateDataStructure() {
        let updated = false;
        prompts.forEach(prompt => {
            if (typeof prompt.copyCount === 'undefined') {
                prompt.copyCount = 0;
                updated = true;
            }
        });
        if (updated) {
            localStorage.setItem('prompts', JSON.stringify(prompts));
        }
    }

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

    // --- 搜索功能 ---
    function performSearch() {
        searchQuery = searchInput.value.trim().toLowerCase();
        
        // 显示或隐藏清除按钮
        if (searchQuery) {
            clearSearchButton.classList.remove('hidden');
        } else {
            clearSearchButton.classList.add('hidden');
        }
        
        renderPrompts();
    }

    function clearSearch() {
        searchInput.value = '';
        searchQuery = '';
        clearSearchButton.classList.add('hidden');
        renderPrompts();
    }

    function matchesSearch(prompt) {
        if (!searchQuery) return true;
        
        // 搜索prompt内容
        const textMatch = prompt.text.toLowerCase().includes(searchQuery);
        
        // 搜索标签
        const tagMatch = prompt.tags.some(tag => 
            tag.toLowerCase().includes(searchQuery)
        );
        
        return textMatch || tagMatch;
    }

    // --- Prompt渲染 --- 
    function renderPrompts() {
        promptList.innerHTML = '';
        
        // 先过滤标签，再搜索，最后按复制次数排序
        let filteredPrompts = prompts.filter(prompt => {
            // 标签过滤
            const tagFilter = activeFilterTags.size === 0 || 
                prompt.tags.some(tag => activeFilterTags.has(tag.trim()));
            
            // 搜索过滤
            const searchFilter = matchesSearch(prompt);
            
            return tagFilter && searchFilter;
        });

        // 按复制次数降序排列（复制次数多的在前面）
        filteredPrompts.sort((a, b) => (b.copyCount || 0) - (a.copyCount || 0));

        if (filteredPrompts.length === 0) {
            const li = document.createElement('li');
            let message = '还没有保存任何Prompt。';
            
            if (searchQuery && activeFilterTags.size > 0) {
                message = '没有匹配当前搜索和筛选条件的Prompt。';
            } else if (searchQuery) {
                message = '没有匹配当前搜索条件的Prompt。';
            } else if (activeFilterTags.size > 0) {
                message = '没有匹配当前筛选的Prompt。';
            }
            
            li.textContent = message;
            li.classList.add('empty-state-placeholder');
            promptList.appendChild(li);
            return;
        }

        filteredPrompts.forEach((prompt, index) => {
            const li = document.createElement('li');
            li.classList.add('prompt-item');
            li.dataset.id = prompt.id;

            const contentDiv = document.createElement('div');
            contentDiv.classList.add('prompt-content');
            
            // 检查内容是否需要折叠
            const lines = prompt.text.split('\n');
            const needsCollapse = lines.length > 3 || prompt.text.length > 200;
            
            if (needsCollapse) {
                // 创建完整内容和预览内容
                const previewText = lines.slice(0, 3).join('\n');
                const fullText = prompt.text;
                
                // 创建内容容器
                const textContainer = document.createElement('div');
                textContainer.classList.add('text-container');
                
                const previewSpan = document.createElement('span');
                previewSpan.classList.add('preview-text');
                previewSpan.textContent = previewText;
                
                const fullSpan = document.createElement('span');
                fullSpan.classList.add('full-text', 'hidden');
                fullSpan.textContent = fullText;
                
                const ellipsis = document.createElement('span');
                ellipsis.classList.add('ellipsis');
                ellipsis.textContent = '...';
                
                textContainer.appendChild(previewSpan);
                textContainer.appendChild(ellipsis);
                textContainer.appendChild(fullSpan);
                contentDiv.appendChild(textContainer);
                
                // 创建展开/收起按钮
                const toggleButton = document.createElement('button');
                toggleButton.classList.add('toggle-button');
                toggleButton.innerHTML = `
                    <span class="expand-text">展开</span>
                    <span class="collapse-text hidden">收起</span>
                    <svg class="expand-icon w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                    <svg class="collapse-icon w-4 h-4 ml-1 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                `;
                
                // 添加点击事件
                toggleButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isExpanded = contentDiv.classList.contains('expanded');
                    
                    if (isExpanded) {
                        // 收起
                        contentDiv.classList.remove('expanded');
                        previewSpan.classList.remove('hidden');
                        ellipsis.classList.remove('hidden');
                        fullSpan.classList.add('hidden');
                        toggleButton.querySelector('.expand-text').classList.remove('hidden');
                        toggleButton.querySelector('.collapse-text').classList.add('hidden');
                        toggleButton.querySelector('.expand-icon').classList.remove('hidden');
                        toggleButton.querySelector('.collapse-icon').classList.add('hidden');
                    } else {
                        // 展开
                        contentDiv.classList.add('expanded');
                        previewSpan.classList.add('hidden');
                        ellipsis.classList.add('hidden');
                        fullSpan.classList.remove('hidden');
                        toggleButton.querySelector('.expand-text').classList.add('hidden');
                        toggleButton.querySelector('.collapse-text').classList.remove('hidden');
                        toggleButton.querySelector('.expand-icon').classList.add('hidden');
                        toggleButton.querySelector('.collapse-icon').classList.remove('hidden');
                    }
                });
                
                contentDiv.appendChild(toggleButton);
            } else {
                // 内容较短，直接显示
                contentDiv.textContent = prompt.text;
            }

            const tagsDiv = document.createElement('div');
            tagsDiv.classList.add('prompt-tags');
            prompt.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.classList.add('prompt-tag');
                tagSpan.textContent = tag.trim();
                tagsDiv.appendChild(tagSpan);
            });

            // 添加复制次数显示
            const copyCountSpan = document.createElement('span');
            copyCountSpan.classList.add('copy-count');
            copyCountSpan.textContent = `复制${prompt.copyCount || 0}次`;
            copyCountSpan.style.color = '#6b7280';
            copyCountSpan.style.fontSize = '0.75rem';
            copyCountSpan.style.marginLeft = '8px';

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('prompt-item-actions'); // 修改类名以匹配CSS

            const copyButton = createActionButton('复制', 
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
                () => copyPrompt(prompt.text, prompt.id));
            
            const oneClickCopyButton = createActionButton('一键复制', 
                '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>',
                () => copyPrompt(prompt.text, prompt.id));

            const editButton = createActionButton('编辑', 
                '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>',
                () => editPrompt(prompt.id));

            const deleteButton = createActionButton('删除', 
                '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>',
                () => deletePrompt(prompt.id));

            // 创建 footer 容器
            const footerDiv = document.createElement('div');
            footerDiv.classList.add('prompt-item-footer');

            // 将复制次数添加到标签区域
            tagsDiv.appendChild(copyCountSpan);

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
                tags: tagsArray,
                copyCount: 0 // 新增：初始化复制次数为0
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

    function copyPrompt(text, id) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('Prompt已复制到剪贴板！');
                const promptIndex = prompts.findIndex(p => p.id === id);
                if (promptIndex > -1) {
                    prompts[promptIndex].copyCount = (prompts[promptIndex].copyCount || 0) + 1;
                    localStorage.setItem('prompts', JSON.stringify(prompts));
                    // 立即重新渲染以显示更新的复制次数
                    renderPrompts();
                }
            })
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
    searchInput.addEventListener('input', performSearch);
    clearSearchButton.addEventListener('click', clearSearch);

    // --- 初始化 --- 
    migrateDataStructure(); // 兼容旧数据
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
                            // 确保导入的prompt包含copyCount字段
                            const promptToAdd = { 
                                ...importedPrompt, 
                                id: newId,
                                copyCount: importedPrompt.copyCount || 0 // 如果没有copyCount则初始化为0
                            };
                            prompts.push(promptToAdd);
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