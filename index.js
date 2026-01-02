// 主应用程序对象
const PDFApp = {
    // 状态管理
    state: {
        splitFiles: [],
        mergeFiles: [],
        watermarkSettings: {
            text: '示例水印',
            size: 30,
            position: 'center',
            opacity: 0.3,
            color: '#000000'
        },
        currentTab: 'split'
    },

    // 初始化应用程序
    init() {
        this.bindEvents();
        this.updateWatermarkPreview();
        this.setupDragAndDrop();
        this.loadSettings();
    },

    // 绑定事件
    bindEvents() {
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // 拆分选项切换
        document.getElementById('splitEvenlyOption').addEventListener('click', () => {
            this.selectSplitOption('evenly');
        });
        
        document.getElementById('splitCustomOption').addEventListener('click', () => {
            this.selectSplitOption('custom');
        });

        // 文件选择
        document.getElementById('splitFileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e, 'split');
        });
        
        document.getElementById('mergeFileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e, 'merge');
        });

        // 水印位置选择
        document.querySelectorAll('.watermark-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.watermark-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
                this.state.watermarkSettings.position = option.getAttribute('data-position');
                this.updateWatermarkPreview();
                this.saveSettings();
            });
        });

        // 水印文字输入
        document.getElementById('watermarkText').addEventListener('input', (e) => {
            this.state.watermarkSettings.text = e.target.value;
            this.updateWatermarkPreview();
            this.saveSettings();
        });

        // 水印大小滑块
        document.getElementById('watermarkSize').addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            this.state.watermarkSettings.size = size;
            document.getElementById('watermarkSizeValue').textContent = size;
            this.updateWatermarkPreview();
            this.saveSettings();
        });

        // 应用水印按钮
        document.getElementById('applyWatermarkBtn').addEventListener('click', () => {
            this.showNotification('水印设置已保存', 'success');
        });

        // 重置水印按钮
        document.getElementById('resetWatermarkBtn').addEventListener('click', () => {
            this.resetWatermarkSettings();
        });

        // 拆分按钮
        document.getElementById('splitBtn').addEventListener('click', () => {
            this.splitPDF();
        });

        // 合并按钮
        document.getElementById('mergeBtn').addEventListener('click', () => {
            this.mergePDFs();
        });

        // 重置按钮
        document.getElementById('resetSplitBtn').addEventListener('click', () => {
            this.resetSplit();
        });
        
        document.getElementById('resetMergeBtn').addEventListener('click', () => {
            this.resetMerge();
        });
    },

    // 设置拖放功能
    setupDragAndDrop() {
        const splitArea = document.getElementById('splitUploadArea');
        const mergeArea = document.getElementById('mergeUploadArea');

        // 拆分区域拖放
        this.setupDragDropForArea(splitArea, 'split');
        
        // 合并区域拖放
        this.setupDragDropForArea(mergeArea, 'merge');
    },

    // 为指定区域设置拖放
    setupDragDropForArea(area, type) {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type === 'application/pdf' || file.name.endsWith('.pdf')
            );
            
            if (files.length > 0) {
                if (type === 'split' && files.length > 1) {
                    this.showNotification('拆分功能只支持单个PDF文件', 'error');
                    return;
                }
                
                this.addFiles(files, type);
            } else {
                this.showNotification('请拖放PDF文件', 'error');
            }
        });
    },

    // 切换标签页
    switchTab(tabId) {
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

        // 更新标签内容状态
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');

        this.state.currentTab = tabId;
    },

    // 选择拆分选项
    selectSplitOption(option) {
        const evenlyOption = document.getElementById('splitEvenlyOption');
        const customOption = document.getElementById('splitCustomOption');
        const customInputs = document.getElementById('customSplitInputs');

        if (option === 'evenly') {
            evenlyOption.classList.add('selected');
            customOption.classList.remove('selected');
            customInputs.style.display = 'none';
        } else {
            evenlyOption.classList.remove('selected');
            customOption.classList.add('selected');
            customInputs.style.display = 'block';
        }
    },

    // 处理文件选择
    handleFileSelect(event, type) {
        const files = Array.from(event.target.files).filter(file => 
            file.type === 'application/pdf' || file.name.endsWith('.pdf')
        );
        
        if (type === 'split' && files.length > 1) {
            this.showNotification('拆分功能只支持单个PDF文件', 'error');
            return;
        }
        
        this.addFiles(files, type);
        event.target.value = ''; // 重置文件输入
    },

    // 添加文件到列表
    addFiles(files, type) {
        const fileList = document.getElementById(`${type}FileList`);
        
        files.forEach(file => {
            // 检查是否已存在同名文件
            const existingFiles = type === 'split' ? this.state.splitFiles : this.state.mergeFiles;
            if (existingFiles.some(f => f.name === file.name)) {
                this.showNotification(`文件 ${file.name} 已存在`, 'warning');
                return;
            }
            
            // 添加到状态
            if (type === 'split') {
                this.state.splitFiles = [file]; // 拆分只保留一个文件
            } else {
                this.state.mergeFiles.push(file);
            }
            
            // 添加到UI
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.draggable = type === 'merge';
            fileItem.dataset.fileName = file.name;
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="remove-file" data-type="${type}">×</button>
            `;
            
            // 如果是合并功能，添加拖拽排序
            if (type === 'merge') {
                fileItem.addEventListener('dragstart', this.handleDragStart.bind(this));
                fileItem.addEventListener('dragover', this.handleDragOver.bind(this));
                fileItem.addEventListener('drop', this.handleDrop.bind(this));
            }
            
            fileList.appendChild(fileItem);
        });
        
        // 更新UI
        this.updateFileListUI(type);
        
        // 为删除按钮添加事件
        document.querySelectorAll(`.remove-file[data-type="${type}"]`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileName = e.target.closest('.file-item').dataset.fileName;
                this.removeFile(fileName, type);
            });
        });
    },

    // 处理拖拽开始
    handleDragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.closest('.file-item').dataset.fileName);
        e.dataTransfer.effectAllowed = 'move';
    },

    // 处理拖拽经过
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },

    // 处理放置
    handleDrop(e) {
        e.preventDefault();
        const draggedFileName = e.dataTransfer.getData('text/plain');
        const targetFileName = e.target.closest('.file-item').dataset.fileName;
        
        if (draggedFileName && targetFileName && draggedFileName !== targetFileName) {
            this.reorderFiles(draggedFileName, targetFileName);
        }
    },

    // 重新排序文件
    reorderFiles(draggedFileName, targetFileName) {
        const draggedIndex = this.state.mergeFiles.findIndex(f => f.name === draggedFileName);
        const targetIndex = this.state.mergeFiles.findIndex(f => f.name === targetFileName);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            // 从数组中移除拖拽的文件
            const [draggedFile] = this.state.mergeFiles.splice(draggedIndex, 1);
            // 插入到目标位置
            this.state.mergeFiles.splice(targetIndex, 0, draggedFile);
            
            // 更新UI
            this.updateFileListUI('merge');
        }
    },

    // 更新文件列表UI
    updateFileListUI(type) {
        const fileList = document.getElementById(`${type}FileList`);
        const files = type === 'split' ? this.state.splitFiles : this.state.mergeFiles;
        
        // 清空列表
        fileList.innerHTML = '';
        
        // 重新添加所有文件
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.draggable = type === 'merge';
            fileItem.dataset.fileName = file.name;
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="remove-file" data-type="${type}">×</button>
            `;
            
            // 如果是合并功能，添加拖拽排序
            if (type === 'merge') {
                fileItem.addEventListener('dragstart', this.handleDragStart.bind(this));
                fileItem.addEventListener('dragover', this.handleDragOver.bind(this));
                fileItem.addEventListener('drop', this.handleDrop.bind(this));
            }
            
            fileList.appendChild(fileItem);
        });
        
        // 为删除按钮添加事件
        document.querySelectorAll(`.remove-file[data-type="${type}"]`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileName = e.target.closest('.file-item').dataset.fileName;
                this.removeFile(fileName, type);
            });
        });
    },

    // 移除文件
    removeFile(fileName, type) {
        if (type === 'split') {
            this.state.splitFiles = this.state.splitFiles.filter(f => f.name !== fileName);
        } else {
            this.state.mergeFiles = this.state.mergeFiles.filter(f => f.name !== fileName);
        }
        
        this.updateFileListUI(type);
    },

    // 拆分PDF
    async splitPDF() {
        if (this.state.splitFiles.length === 0) {
            this.showNotification('请先上传PDF文件', 'error');
            return;
        }

        const file = this.state.splitFiles[0];
        const splitType = document.getElementById('splitEvenlyOption').classList.contains('selected') ? 'evenly' : 'custom';
        
        // 显示进度条
        const progressContainer = document.getElementById('splitProgress');
        const progressBar = document.getElementById('splitProgressBar');
        const status = document.getElementById('splitStatus');
        const resultsContainer = document.getElementById('splitResults');
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        status.textContent = '正在加载PDF文件...';
        
        try {
            // 读取PDF文件
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();
            
            status.textContent = `PDF已加载，共${totalPages}页`;
            progressBar.style.width = '20%';
            
            let ranges = [];
            
            // 确定拆分范围
            if (splitType === 'evenly') {
                // 平均分为两份
                const mid = Math.ceil(totalPages / 2);
                ranges = [
                    { start: 1, end: mid, name: '第一部分' },
                    { start: mid + 1, end: totalPages, name: '第二部分' }
                ];
            } else {
                // 自定义拆分
                const rangeText = document.getElementById('pageRanges').value;
                const lines = rangeText.split('\n').filter(line => line.trim() !== '');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    const match = line.match(/^(\d+)-(\d+)$/);
                    
                    if (!match) {
                        this.showNotification(`第${i+1}行格式错误，请使用"起始页-结束页"格式`, 'error');
                        return;
                    }
                    
                    const start = parseInt(match[1]);
                    const end = parseInt(match[2]);
                    
                    if (start < 1 || end > totalPages || start > end) {
                        this.showNotification(`第${i+1}页范围无效，请检查页码范围`, 'error');
                        return;
                    }
                    
                    ranges.push({
                        start,
                        end,
                        name: `第${i+1}部分`
                    });
                }
            }
            
            status.textContent = `开始拆分，共${ranges.length}个部分`;
            progressBar.style.width = '40%';
            
            const results = [];
            
            // 处理每个范围
            for (let i = 0; i < ranges.length; i++) {
                const range = ranges[i];
                status.textContent = `正在处理第${i+1}/${ranges.length}部分 (${range.start}-${range.end}页)`;
                
                // 创建新PDF文档
                const newPdf = await PDFLib.PDFDocument.create();
                
                // 复制页面
                const pages = await newPdf.copyPages(pdfDoc, 
                    Array.from({length: range.end - range.start + 1}, (_, idx) => range.start - 1 + idx));
                
                pages.forEach(page => newPdf.addPage(page));
                
                // 添加水印
                if (this.state.watermarkSettings.text) {
                    await this.addWatermarkToDocument(newPdf);
                }
                
                // 保存PDF
                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const fileName = `${file.name.replace('.pdf', '')}_${range.name}.pdf`;
                
                results.push({
                    name: fileName,
                    blob,
                    size: blob.size
                });
                
                // 更新进度
                progressBar.style.width = `${40 + (i + 1) * (50 / ranges.length)}%`;
            }
            
            // 完成
            progressBar.style.width = '100%';
            status.textContent = '拆分完成！';
            
            // 显示结果
            this.showSplitResults(results);
            
            // 保存设置
            this.saveSettings();
            
        } catch (error) {
            console.error('拆分PDF时出错:', error);
            this.showNotification('处理PDF时出错: ' + error.message, 'error');
            status.textContent = '处理失败';
        }
    },

    // 合并PDF
    async mergePDFs() {
        if (this.state.mergeFiles.length < 2) {
            this.showNotification('请至少上传两个PDF文件进行合并', 'error');
            return;
        }

        // 显示进度条
        const progressContainer = document.getElementById('mergeProgress');
        const progressBar = document.getElementById('mergeProgressBar');
        const status = document.getElementById('mergeStatus');
        const resultsContainer = document.getElementById('mergeResults');
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        status.textContent = '开始合并PDF文件...';
        
        try {
            // 创建新PDF文档
            const mergedPdf = await PDFLib.PDFDocument.create();
            
            // 处理每个文件
            for (let i = 0; i < this.state.mergeFiles.length; i++) {
                const file = this.state.mergeFiles[i];
                status.textContent = `正在处理第${i+1}/${this.state.mergeFiles.length}个文件: ${file.name}`;
                progressBar.style.width = `${(i / this.state.mergeFiles.length) * 80}%`;
                
                // 读取PDF文件
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                
                // 复制所有页面
                const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }
            
            status.textContent = '正在添加水印...';
            progressBar.style.width = '90%';
            
            // 添加水印
            if (this.state.watermarkSettings.text) {
                await this.addWatermarkToDocument(mergedPdf);
            }
            
            // 保存合并后的PDF
            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            
            const fileName = document.getElementById('mergedFileName').value;
            const finalFileName = fileName.endsWith('.pdf') ? fileName : fileName + '.pdf';
            
            // 完成
            progressBar.style.width = '100%';
            status.textContent = '合并完成！';
            
            // 显示结果
            this.showMergeResult(finalFileName, blob);
            
            // 保存设置
            this.saveSettings();
            
        } catch (error) {
            console.error('合并PDF时出错:', error);
            this.showNotification('处理PDF时出错: ' + error.message, 'error');
            status.textContent = '处理失败';
        }
    },

    // 添加水印到PDF文档
    async addWatermarkToDocument(pdfDoc) {
        const pages = pdfDoc.getPages();
        const { text, size, position, opacity, color } = this.state.watermarkSettings;
        
        // 解析颜色
        const rgbColor = this.hexToRgb(color);
        
        for (const page of pages) {
            const { width, height } = page.getSize();
            
            // 根据位置设置水印
            switch (position) {
                case 'center':
                    // 单个居中水印
                    page.drawText(text, {
                        x: width / 2 - (text.length * size) / 4,
                        y: height / 2,
                        size: size,
                        opacity: opacity,
                        color: PDFLib.rgb(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255),
                        rotate: PDFLib.degrees(-45)
                    });
                    break;
                    
                case 'diagonal':
                    // 对角线平铺
                    const diagonalSpacing = size * 3;
                    for (let x = -width; x < width * 2; x += diagonalSpacing) {
                        for (let y = -height; y < height * 2; y += diagonalSpacing) {
                            if ((x + y) % (diagonalSpacing * 2) === 0) {
                                page.drawText(text, {
                                    x: x,
                                    y: y,
                                    size: size,
                                    opacity: opacity / 2,
                                    color: PDFLib.rgb(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255),
                                    rotate: PDFLib.degrees(-45)
                                });
                            }
                        }
                    }
                    break;
                    
                case 'tiled':
                    // 网格平铺
                    const cols = Math.ceil(width / (size * text.length * 0.6));
                    const rows = Math.ceil(height / (size * 1.5));
                    const colSpacing = width / cols;
                    const rowSpacing = height / rows;
                    
                    for (let col = 0; col < cols; col++) {
                        for (let row = 0; row < rows; row++) {
                            page.drawText(text, {
                                x: col * colSpacing + colSpacing / 2 - (text.length * size) / 4,
                                y: row * rowSpacing + rowSpacing / 2,
                                size: size,
                                opacity: opacity / 3,
                                color: PDFLib.rgb(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255),
                                rotate: PDFLib.degrees(-45)
                            });
                        }
                    }
                    break;
                    
                case 'top-left':
                    // 左上角
                    page.drawText(text, {
                        x: size,
                        y: height - size * 1.5,
                        size: size,
                        opacity: opacity,
                        color: PDFLib.rgb(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255)
                    });
                    break;
            }
        }
    },

    // 显示拆分结果
    showSplitResults(results) {
        const resultsContainer = document.getElementById('splitResults');
        resultsContainer.innerHTML = '<h3>拆分结果</h3>';
        
        results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            resultItem.innerHTML = `
                <div class="result-info">
                    <div class="result-name">${result.name}</div>
                    <div class="result-size">${this.formatFileSize(result.size)}</div>
                </div>
                <button class="result-download" data-index="${index}">下载</button>
            `;
            
            resultsContainer.appendChild(resultItem);
        });
        
        // 为下载按钮添加事件
        document.querySelectorAll('#splitResults .result-download').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.downloadFile(results[index].blob, results[index].name);
            });
        });
        
        resultsContainer.style.display = 'block';
    },

    // 显示合并结果
    showMergeResult(fileName, blob) {
        const resultsContainer = document.getElementById('mergeResults');
        
        resultsContainer.innerHTML = `
            <h3>合并结果</h3>
            <div class="result-item">
                <div class="result-info">
                    <div class="result-name">${fileName}</div>
                    <div class="result-size">${this.formatFileSize(blob.size)}</div>
                </div>
                <button class="result-download" id="downloadMergedBtn">下载</button>
            </div>
        `;
        
        // 为下载按钮添加事件
        document.getElementById('downloadMergedBtn').addEventListener('click', () => {
            this.downloadFile(blob, fileName);
        });
        
        resultsContainer.style.display = 'block';
    },

    // 下载文件
    downloadFile(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // 更新水印预览
    updateWatermarkPreview() {
        const preview = document.getElementById('watermarkPreview');
        const { text, size, position } = this.state.watermarkSettings;
        
        preview.innerHTML = '';
        
        // 创建水印预览
        const watermark = document.createElement('div');
        watermark.className = 'watermark-text';
        watermark.textContent = text;
        watermark.style.fontSize = `${size}px`;
        watermark.style.opacity = '0.3';
        watermark.style.fontWeight = 'bold';
        
        // 根据位置设置样式
        const previewWidth = preview.clientWidth;
        const previewHeight = preview.clientHeight;
        
        switch (position) {
            case 'center':
                watermark.style.left = '50%';
                watermark.style.top = '50%';
                watermark.style.transform = 'translate(-50%, -50%) rotate(-45deg)';
                break;
                
            case 'diagonal':
                // 添加多个对角线水印
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const wm = document.createElement('div');
                        wm.className = 'watermark-text';
                        wm.textContent = text;
                        wm.style.fontSize = `${size}px`;
                        wm.style.opacity = '0.2';
                        wm.style.fontWeight = 'bold';
                        wm.style.left = `${50 + i * 40}%`;
                        wm.style.top = `${50 + j * 40}%`;
                        wm.style.transform = 'translate(-50%, -50%) rotate(-45deg)';
                        preview.appendChild(wm);
                    }
                }
                break;
                
            case 'tiled':
                // 添加网格平铺水印
                const cols = 3;
                const rows = 3;
                for (let col = 0; col < cols; col++) {
                    for (let row = 0; row < rows; row++) {
                        const wm = document.createElement('div');
                        wm.className = 'watermark-text';
                        wm.textContent = text;
                        wm.style.fontSize = `${size * 0.8}px`;
                        wm.style.opacity = '0.15';
                        wm.style.fontWeight = 'bold';
                        wm.style.left = `${(col + 0.5) * (100 / cols)}%`;
                        wm.style.top = `${(row + 0.5) * (100 / rows)}%`;
                        wm.style.transform = 'translate(-50%, -50%) rotate(-45deg)';
                        preview.appendChild(wm);
                    }
                }
                break;
                
            case 'top-left':
                watermark.style.left = '10%';
                watermark.style.top = '85%';
                watermark.style.transform = 'translate(0, -50%)';
                break;
        }
        
        // 如果不是平铺模式，添加单个水印
        if (position !== 'diagonal' && position !== 'tiled') {
            preview.appendChild(watermark);
        }
    },

    // 重置拆分
    resetSplit() {
        this.state.splitFiles = [];
        document.getElementById('splitFileList').innerHTML = '';
        document.getElementById('splitResults').style.display = 'none';
        document.getElementById('splitProgress').style.display = 'none';
        document.getElementById('pageRanges').value = '';
        this.selectSplitOption('evenly');
    },

    // 重置合并
    resetMerge() {
        this.state.mergeFiles = [];
        document.getElementById('mergeFileList').innerHTML = '';
        document.getElementById('mergeResults').style.display = 'none';
        document.getElementById('mergeProgress').style.display = 'none';
        document.getElementById('mergedFileName').value = '合并后的文档.pdf';
    },

    // 重置水印设置
    resetWatermarkSettings() {
        this.state.watermarkSettings = {
            text: '示例水印',
            size: 30,
            position: 'center',
            opacity: 0.3,
            color: '#000000'
        };
        
        document.getElementById('watermarkText').value = this.state.watermarkSettings.text;
        document.getElementById('watermarkSize').value = this.state.watermarkSettings.size;
        document.getElementById('watermarkSizeValue').textContent = this.state.watermarkSettings.size;
        
        // 重置位置选择
        document.querySelectorAll('.watermark-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.getAttribute('data-position') === this.state.watermarkSettings.position) {
                opt.classList.add('selected');
            }
        });
        
        this.updateWatermarkPreview();
        this.saveSettings();
        this.showNotification('水印设置已重置', 'success');
    },

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // 样式
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '6px';
        notification.style.zIndex = '1000';
        notification.style.fontWeight = '500';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.style.animation = 'slideIn 0.3s ease';
        
        // 类型颜色
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.style.color = 'white';
        
        document.body.appendChild(notification);
        
        // 3秒后移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
        
        // 添加动画关键帧
        if (!document.getElementById('notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    },

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // 十六进制颜色转RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    // 保存设置到本地存储
    saveSettings() {
        try {
            localStorage.setItem('pdfTools_watermark', JSON.stringify(this.state.watermarkSettings));
            localStorage.setItem('pdfTools_splitType', 
                document.getElementById('splitEvenlyOption').classList.contains('selected') ? 'evenly' : 'custom');
            
            // 保存自定义拆分范围
            const pageRanges = document.getElementById('pageRanges').value;
            if (pageRanges) {
                localStorage.setItem('pdfTools_pageRanges', pageRanges);
            }
            
            // 保存合并文件名
            const mergedFileName = document.getElementById('mergedFileName').value;
            if (mergedFileName) {
                localStorage.setItem('pdfTools_mergedFileName', mergedFileName);
            }
        } catch (e) {
            console.warn('无法保存设置到本地存储:', e);
        }
    },

    // 从本地存储加载设置
    loadSettings() {
        try {
            // 加载水印设置
            const savedWatermark = localStorage.getItem('pdfTools_watermark');
            if (savedWatermark) {
                this.state.watermarkSettings = JSON.parse(savedWatermark);
                
                // 更新UI
                document.getElementById('watermarkText').value = this.state.watermarkSettings.text;
                document.getElementById('watermarkSize').value = this.state.watermarkSettings.size;
                document.getElementById('watermarkSizeValue').textContent = this.state.watermarkSettings.size;
                
                // 更新位置选择
                document.querySelectorAll('.watermark-option').forEach(opt => {
                    opt.classList.remove('selected');
                    if (opt.getAttribute('data-position') === this.state.watermarkSettings.position) {
                        opt.classList.add('selected');
                    }
                });
                
                this.updateWatermarkPreview();
            }
            
            // 加载拆分类型
            const savedSplitType = localStorage.getItem('pdfTools_splitType');
            if (savedSplitType) {
                this.selectSplitOption(savedSplitType);
            }
            
            // 加载自定义拆分范围
            const savedPageRanges = localStorage.getItem('pdfTools_pageRanges');
            if (savedPageRanges) {
                document.getElementById('pageRanges').value = savedPageRanges;
            }
            
            // 加载合并文件名
            const savedMergedFileName = localStorage.getItem('pdfTools_mergedFileName');
            if (savedMergedFileName) {
                document.getElementById('mergedFileName').value = savedMergedFileName;
            }
        } catch (e) {
            console.warn('无法从本地存储加载设置:', e);
        }
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    PDFApp.init();
});