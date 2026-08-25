/**
 * SubSync Studio - Subtitle Timing Fixer Engine
 * Precision synchronizer for reference-based subtitle re-timing (e.g. English -> Sinhala)
 */

class SubtitleFixerApp {
    constructor() {
        this.state = {
            refFile: null,
            targetFile: null,
            refCues: [],
            targetCues: [],
            originalTargetCues: [],
            history: [],
            historyIndex: -1,
            maxHistory: 30,
            
            // Playback state
            isPlaying: false,
            currentTime: 0,
            maxDuration: 0,
            playbackSpeed: 1,
            timerId: null,
            lastFrameTime: 0,
            
            // UI state
            activeTab: 'twoPointTab',
            syncScroll: true,
            filterText: '',
            showDiffBadges: true,
            anchorA: { ref: null, target: null },
            anchorB: { ref: null, target: null }
        };

        this.initDOMElements();
        this.bindEvents();
    }

    initDOMElements() {
        // Dropzones & Inputs
        this.uploadSection = document.getElementById('uploadSection');
        this.fileStatusBar = document.getElementById('fileStatusBar');
        this.btnToggleUploadSection = document.getElementById('btnToggleUploadSection');

        this.refDropZone = document.getElementById('refDropZone');
        this.targetDropZone = document.getElementById('targetDropZone');
        this.refFileInput = document.getElementById('refFileInput');
        this.targetFileInput = document.getElementById('targetFileInput');
        
        this.refFileName = document.getElementById('refFileName');
        this.targetFileName = document.getElementById('targetFileName');
        this.refStats = document.getElementById('refStats');
        this.targetStats = document.getElementById('targetStats');
        this.refCount = document.getElementById('refCount');
        this.refDuration = document.getElementById('refDuration');
        this.targetCount = document.getElementById('targetCount');
        this.targetDuration = document.getElementById('targetDuration');

        // Status Bar elements
        this.barRefName = document.getElementById('barRefName');
        this.barRefCount = document.getElementById('barRefCount');
        this.barTargetName = document.getElementById('barTargetName');
        this.barTargetCount = document.getElementById('barTargetCount');
        
        // Header buttons
        this.btnLoadSample = document.getElementById('btnLoadSample');
        this.btnUndo = document.getElementById('btnUndo');
        this.btnRedo = document.getElementById('btnRedo');
        this.btnReset = document.getElementById('btnReset');
        this.btnExportSrt = document.getElementById('btnExportSrt');

        // Lists
        this.refSubList = document.getElementById('refSubList');
        this.targetSubList = document.getElementById('targetSubList');
        this.colRefCount = document.getElementById('colRefCount');
        this.colTargetCount = document.getElementById('colTargetCount');
        this.colRefName = document.getElementById('colRefName');
        this.colTargetName = document.getElementById('colTargetName');
        this.visibleCounter = document.getElementById('visibleCounter');

        // Tabs
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        // 2-Point inputs
        this.anchorA_ref = document.getElementById('anchorA_ref');
        this.anchorA_target = document.getElementById('anchorA_target');
        this.anchorB_ref = document.getElementById('anchorB_ref');
        this.anchorB_target = document.getElementById('anchorB_target');
        this.metricRatio = document.getElementById('metricRatio');
        this.metricOffset = document.getElementById('metricOffset');
        this.btnApplyTwoPoint = document.getElementById('btnApplyTwoPoint');
        this.btnAutoSuggestAnchors = document.getElementById('btnAutoSuggestAnchors');

        // Shift inputs
        this.shiftSecondsInput = document.getElementById('shiftSecondsInput');
        this.btnApplyCustomShift = document.getElementById('btnApplyCustomShift');

        // Speed inputs
        this.speedMultiplierInput = document.getElementById('speedMultiplierInput');
        this.btnApplyCustomSpeed = document.getElementById('btnApplyCustomSpeed');

        // Section inputs
        this.sectionStartCue = document.getElementById('sectionStartCue');
        this.sectionStartTime = document.getElementById('sectionStartTime');
        this.sectionShiftOffset = document.getElementById('sectionShiftOffset');
        this.btnApplySectionShift = document.getElementById('btnApplySectionShift');

        // Direct Transfer inputs
        this.chkStrictIndexMatch = document.getElementById('chkStrictIndexMatch');
        this.btnApplyDirectTransfer = document.getElementById('btnApplyDirectTransfer');

        // Controls
        this.filterInput = document.getElementById('filterInput');
        this.chkSyncScroll = document.getElementById('chkSyncScroll');
        this.chkHighlightDiff = document.getElementById('chkHighlightDiff');

        // Player
        this.btnPlayPause = document.getElementById('btnPlayPause');
        this.playIcon = document.getElementById('playIcon');
        this.pauseIcon = document.getElementById('pauseIcon');
        this.btnStop = document.getElementById('btnStop');
        this.timelineSlider = document.getElementById('timelineSlider');
        this.playerCurrentTime = document.getElementById('playerCurrentTime');
        this.playerTotalTime = document.getElementById('playerTotalTime');
        this.playbackSpeedSelect = document.getElementById('playbackSpeedSelect');
        this.liveRefText = document.getElementById('liveRefText');
        this.liveTargetText = document.getElementById('liveTargetText');

        // Modal
        this.exportModal = document.getElementById('exportModal');
        this.btnCloseModal = document.getElementById('btnCloseModal');
        this.rawSrtOutput = document.getElementById('rawSrtOutput');
        this.exportSummary = document.getElementById('exportSummary');
        this.btnCopyClipboard = document.getElementById('btnCopyClipboard');
        this.btnDownloadFixedFile = document.getElementById('btnDownloadFixedFile');
    }

    bindEvents() {
        // File selection & Dropzones
        this.setupDropZone(this.refDropZone, this.refFileInput, (file) => this.loadSubtitleFile(file, 'ref'));
        this.setupDropZone(this.targetDropZone, this.targetFileInput, (file) => this.loadSubtitleFile(file, 'target'));

        // Toggle Upload Section
        if (this.btnToggleUploadSection) {
            this.btnToggleUploadSection.addEventListener('click', () => {
                const isHidden = this.uploadSection.style.display === 'none';
                this.uploadSection.style.display = isHidden ? 'block' : 'none';
                this.btnToggleUploadSection.textContent = isHidden ? 'Hide File Upload' : 'Change Files';
            });
        }

        // Load Sample Button
        this.btnLoadSample.addEventListener('click', () => this.loadSampleData());

        // Header Actions
        this.btnUndo.addEventListener('click', () => this.undo());
        this.btnRedo.addEventListener('click', () => this.redo());
        this.btnReset.addEventListener('click', () => this.resetToOriginal());
        this.btnExportSrt.addEventListener('click', () => this.openExportModal());

        // Tabs
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.tabButtons.forEach(b => b.classList.remove('active'));
                this.tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const targetTab = document.getElementById(btn.dataset.tab);
                if (targetTab) targetTab.classList.add('active');
                this.state.activeTab = btn.dataset.tab;
            });
        });

        // 2-Point sync
        const updateMetricsHandler = () => this.updateTwoPointMetrics();
        this.anchorA_ref.addEventListener('input', updateMetricsHandler);
        this.anchorA_target.addEventListener('input', updateMetricsHandler);
        this.anchorB_ref.addEventListener('input', updateMetricsHandler);
        this.anchorB_target.addEventListener('input', updateMetricsHandler);
        this.btnApplyTwoPoint.addEventListener('click', () => this.applyTwoPointSync());
        this.btnAutoSuggestAnchors.addEventListener('click', () => this.autoSuggestAnchors());

        // Global Shift
        this.btnApplyCustomShift.addEventListener('click', () => {
            const shiftSec = parseFloat(this.shiftSecondsInput.value);
            if (isNaN(shiftSec) || shiftSec === 0) {
                this.showToast('Please enter a valid shift value in seconds', 'error');
                return;
            }
            this.applyShift(shiftSec);
        });

        // Speed / Multiplier
        this.btnApplyCustomSpeed.addEventListener('click', () => {
            const mult = parseFloat(this.speedMultiplierInput.value);
            if (isNaN(mult) || mult <= 0) {
                this.showToast('Please enter a valid speed multiplier greater than 0', 'error');
                return;
            }
            this.applySpeedMultiplier(mult);
        });

        // Section Shift
        this.btnApplySectionShift.addEventListener('click', () => this.applySectionShift());

        // Direct Transfer
        this.btnApplyDirectTransfer.addEventListener('click', () => this.applyDirectTransfer());

        // Filter / Search
        this.filterInput.addEventListener('input', (e) => {
            this.state.filterText = e.target.value.toLowerCase().trim();
            this.renderSubtitles();
        });

        // Toggle Sync Scroll
        this.chkSyncScroll.addEventListener('change', (e) => {
            this.state.syncScroll = e.target.checked;
        });

        // Toggle Highlight Diff
        this.chkHighlightDiff.addEventListener('change', (e) => {
            this.state.showDiffBadges = e.target.checked;
            this.renderSubtitles();
        });

        // Synchronized Scrolling
        this.refSubList.addEventListener('scroll', () => {
            if (this.state.syncScroll && !this._isScrollingTarget) {
                this._isScrollingRef = true;
                const ratio = this.refSubList.scrollTop / (this.refSubList.scrollHeight - this.refSubList.clientHeight || 1);
                this.targetSubList.scrollTop = ratio * (this.targetSubList.scrollHeight - this.targetSubList.clientHeight || 1);
                setTimeout(() => { this._isScrollingRef = false; }, 50);
            }
        });

        this.targetSubList.addEventListener('scroll', () => {
            if (this.state.syncScroll && !this._isScrollingRef) {
                this._isScrollingTarget = true;
                const ratio = this.targetSubList.scrollTop / (this.targetSubList.scrollHeight - this.targetSubList.clientHeight || 1);
                this.refSubList.scrollTop = ratio * (this.refSubList.scrollHeight - this.refSubList.clientHeight || 1);
                setTimeout(() => { this._isScrollingTarget = false; }, 50);
            }
        });

        // Live Player
        this.btnPlayPause.addEventListener('click', () => this.togglePlayPause());
        this.btnStop.addEventListener('click', () => this.stopPlayback());
        this.timelineSlider.addEventListener('input', (e) => {
            this.seekTo(parseFloat(e.target.value));
        });
        this.playbackSpeedSelect.addEventListener('change', (e) => {
            this.state.playbackSpeed = parseFloat(e.target.value) || 1;
        });

        // Export Modal
        this.btnCloseModal.addEventListener('click', () => this.closeExportModal());
        this.exportModal.addEventListener('click', (e) => {
            if (e.target === this.exportModal) this.closeExportModal();
        });
        this.btnCopyClipboard.addEventListener('click', () => this.copyFixedSrtToClipboard());
        this.btnDownloadFixedFile.addEventListener('click', () => this.downloadFixedSrt());

        // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Space)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.redo();
            } else if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlayPause();
            }
        });
    }

    setupDropZone(zone, input, onFileLoaded) {
        zone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                input.click();
            }
        });

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) onFileLoaded(file);
        });

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) onFileLoaded(file);
        });
    }

    // ==========================================
    // SRT PARSER & FORMATTER
    // ==========================================

    parseSRT(data) {
        if (!data) return [];
        // Clean BOM and standardize line endings
        const cleaned = data.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const blocks = cleaned.trim().split(/\n\s*\n+/);
        const cues = [];

        blocks.forEach((block) => {
            const lines = block.trim().split('\n');
            if (lines.length < 2) return;

            let cueIndex = lines[0].trim();
            let timeLine = lines[1].trim();
            let textStartIndex = 2;

            if (!timeLine.includes('-->') && lines[0].includes('-->')) {
                timeLine = lines[0].trim();
                cueIndex = String(cues.length + 1);
                textStartIndex = 1;
            }

            const timeMatch = timeLine.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{3})/);
            if (!timeMatch) return;

            const startStr = timeMatch[1].replace('.', ',');
            const endStr = timeMatch[2].replace('.', ',');
            const startSec = this.parseTimestampToSeconds(startStr);
            const endSec = this.parseTimestampToSeconds(endStr);
            const text = lines.slice(textStartIndex).join('\n').trim();

            cues.push({
                idx: cues.length + 1,
                originalIdx: cueIndex,
                start: startSec,
                end: endSec,
                startStr: this.formatSecondsToTimestamp(startSec),
                endStr: this.formatSecondsToTimestamp(endSec),
                text: text
            });
        });

        return cues;
    }

    parseTimestampToSeconds(ts) {
        if (!ts) return 0;
        const normalized = ts.replace('.', ',');
        const parts = normalized.split(',');
        const ms = parts[1] ? parseInt(parts[1], 10) : 0;
        const hms = parts[0].split(':').map(Number);
        if (hms.length === 3) {
            return hms[0] * 3600 + hms[1] * 60 + hms[2] + ms / 1000;
        } else if (hms.length === 2) {
            return hms[0] * 60 + hms[1] + ms / 1000;
        }
        return 0;
    }

    formatSecondsToTimestamp(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const milliseconds = Math.floor((totalSeconds % 1) * 1000);

        const pad = (num, size = 2) => String(num).padStart(size, '0');
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
    }

    generateSRT(cues) {
        return cues.map((cue, i) => {
            const startStr = this.formatSecondsToTimestamp(cue.start);
            const endStr = this.formatSecondsToTimestamp(cue.end);
            return `${i + 1}\n${startStr} --> ${endStr}\n${cue.text}\n`;
        }).join('\n');
    }

    // ==========================================
    // FILE LOADING
    // ==========================================

    loadSubtitleFile(file, type) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const cues = this.parseSRT(content);
            
            if (cues.length === 0) {
                this.showToast(`Failed to parse valid SRT cues from ${file.name}`, 'error');
                return;
            }

            if (type === 'ref') {
                this.state.refFile = file;
                this.state.refCues = cues;
                this.refFileName.textContent = file.name;
                this.colRefName.textContent = file.name;
                this.refCount.textContent = cues.length;
                const maxTime = cues[cues.length - 1].end;
                this.refDuration.textContent = this.formatSecondsToTimestamp(maxTime).split(',')[0];
                this.refStats.style.display = 'flex';
                this.refDropZone.classList.add('loaded');

                if (this.barRefName) this.barRefName.textContent = file.name;
                if (this.barRefCount) this.barRefCount.textContent = `${cues.length} cues`;

                this.showToast(`Loaded ${cues.length} Reference cues from ${file.name}`, 'success');
            } else {
                this.state.targetFile = file;
                this.state.targetCues = JSON.parse(JSON.stringify(cues));
                this.state.originalTargetCues = JSON.parse(JSON.stringify(cues));
                this.state.history = [JSON.parse(JSON.stringify(cues))];
                this.state.historyIndex = 0;
                
                this.targetFileName.textContent = file.name;
                this.colTargetName.textContent = file.name;
                this.targetCount.textContent = cues.length;
                const maxTime = cues[cues.length - 1].end;
                this.targetDuration.textContent = this.formatSecondsToTimestamp(maxTime).split(',')[0];
                this.targetStats.style.display = 'flex';
                this.targetDropZone.classList.add('loaded');

                if (this.barTargetName) this.barTargetName.textContent = file.name;
                if (this.barTargetCount) this.barTargetCount.textContent = `${cues.length} cues`;
                
                this.btnReset.disabled = false;
                this.btnExportSrt.disabled = false;
                this.showToast(`Loaded ${cues.length} Target cues from ${file.name}`, 'success');
            }

            this.updateFileStatusView();
            this.updateTotalDuration();
            this.renderSubtitles();
            this.updateHistoryButtons();

            if (this.state.refCues.length > 0 && this.state.targetCues.length > 0) {
                this.autoSuggestAnchors();
            }
        };

        reader.onerror = () => {
            this.showToast(`Error reading file: ${file.name}`, 'error');
        };

        reader.readAsText(file, 'UTF-8');
    }

    updateFileStatusView() {
        if (this.state.refCues.length > 0 || this.state.targetCues.length > 0) {
            if (this.fileStatusBar) this.fileStatusBar.style.display = 'flex';
            if (this.uploadSection) this.uploadSection.style.display = 'none';
        }
    }

    async loadSampleData() {
        this.showToast('Loading sample english.srt and sinhala.srt files...', 'info');
        try {
            const [engRes, sinRes] = await Promise.all([
                fetch('english.srt'),
                fetch('sinhala.srt')
            ]);

            if (engRes.ok && sinRes.ok) {
                const engText = await engRes.text();
                const sinText = await sinRes.text();

                this.loadSubtitleText(engText, 'english.srt', 'ref');
                this.loadSubtitleText(sinText, 'sinhala.srt', 'target');
                this.showToast('Sample files loaded successfully!', 'success');
            } else {
                throw new Error('Local fetch failed');
            }
        } catch (err) {
            console.warn('Sample fetch fallback:', err);
            this.showToast('Loaded sample subtitles', 'info');
        }
    }

    loadSubtitleText(text, name, type) {
        const cues = this.parseSRT(text);
        if (type === 'ref') {
            this.state.refFile = { name };
            this.state.refCues = cues;
            this.refFileName.textContent = name;
            this.colRefName.textContent = name;
            this.refCount.textContent = cues.length;
            const maxTime = cues[cues.length - 1].end;
            this.refDuration.textContent = this.formatSecondsToTimestamp(maxTime).split(',')[0];
            this.refStats.style.display = 'flex';
            this.refDropZone.classList.add('loaded');

            if (this.barRefName) this.barRefName.textContent = name;
            if (this.barRefCount) this.barRefCount.textContent = `${cues.length} cues`;
        } else {
            this.state.targetFile = { name };
            this.state.targetCues = JSON.parse(JSON.stringify(cues));
            this.state.originalTargetCues = JSON.parse(JSON.stringify(cues));
            this.state.history = [JSON.parse(JSON.stringify(cues))];
            this.state.historyIndex = 0;
            
            this.targetFileName.textContent = name;
            this.colTargetName.textContent = name;
            this.targetCount.textContent = cues.length;
            const maxTime = cues[cues.length - 1].end;
            this.targetDuration.textContent = this.formatSecondsToTimestamp(maxTime).split(',')[0];
            this.targetStats.style.display = 'flex';
            this.targetDropZone.classList.add('loaded');

            if (this.barTargetName) this.barTargetName.textContent = name;
            if (this.barTargetCount) this.barTargetCount.textContent = `${cues.length} cues`;
            
            this.btnReset.disabled = false;
            this.btnExportSrt.disabled = false;
        }

        this.updateFileStatusView();
        this.updateTotalDuration();
        this.renderSubtitles();
        this.updateHistoryButtons();

        if (this.state.refCues.length > 0 && this.state.targetCues.length > 0) {
            this.autoSuggestAnchors();
        }
    }

    updateTotalDuration() {
        const refMax = this.state.refCues.length ? this.state.refCues[this.state.refCues.length - 1].end : 0;
        const targetMax = this.state.targetCues.length ? this.state.targetCues[this.state.targetCues.length - 1].end : 0;
        this.state.maxDuration = Math.max(refMax, targetMax, 1);
        this.timelineSlider.max = this.state.maxDuration;
        this.playerTotalTime.textContent = this.formatSecondsToTimestamp(this.state.maxDuration);
    }

    // ==========================================
    // SYNC CALCULATIONS & TRANSFORMATIONS
    // ==========================================

    pushHistoryState(description) {
        if (this.state.historyIndex < this.state.history.length - 1) {
            this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
        }
        this.state.history.push(JSON.parse(JSON.stringify(this.state.targetCues)));
        if (this.state.history.length > this.state.maxHistory) {
            this.state.history.shift();
        } else {
            this.state.historyIndex++;
        }
        this.updateHistoryButtons();
        if (description) {
            this.showToast(description, 'success');
        }
    }

    undo() {
        if (this.state.historyIndex > 0) {
            this.state.historyIndex--;
            this.state.targetCues = JSON.parse(JSON.stringify(this.state.history[this.state.historyIndex]));
            this.renderSubtitles();
            this.updateTotalDuration();
            this.updateHistoryButtons();
            this.showToast('Action undone (Ctrl+Z)', 'info');
        }
    }

    redo() {
        if (this.state.historyIndex < this.state.history.length - 1) {
            this.state.historyIndex++;
            this.state.targetCues = JSON.parse(JSON.stringify(this.state.history[this.state.historyIndex]));
            this.renderSubtitles();
            this.updateTotalDuration();
            this.updateHistoryButtons();
            this.showToast('Action redone (Ctrl+Y)', 'info');
        }
    }

    resetToOriginal() {
        if (!this.state.originalTargetCues.length) return;
        if (confirm('Are you sure you want to reset all subtitle timings back to original?')) {
            this.state.targetCues = JSON.parse(JSON.stringify(this.state.originalTargetCues));
            this.pushHistoryState('Reset all timings back to original');
            this.renderSubtitles();
            this.updateTotalDuration();
        }
    }

    updateHistoryButtons() {
        this.btnUndo.disabled = this.state.historyIndex <= 0;
        this.btnRedo.disabled = this.state.historyIndex >= this.state.history.length - 1;
    }

    // --- 2-Point Anchor Sync Logic ---
    autoSuggestAnchors() {
        if (!this.state.refCues.length || !this.state.targetCues.length) return;

        // Auto-select Anchor A (first cue)
        const refA = this.state.refCues[0];
        const tarA = this.state.targetCues[0];
        this.anchorA_ref.value = this.formatSecondsToTimestamp(refA.start);
        this.anchorA_target.value = this.formatSecondsToTimestamp(tarA.start);

        // Auto-select Anchor B (last cue)
        const refB = this.state.refCues[this.state.refCues.length - 1];
        const tarB = this.state.targetCues[this.state.targetCues.length - 1];
        this.anchorB_ref.value = this.formatSecondsToTimestamp(refB.start);
        this.anchorB_target.value = this.formatSecondsToTimestamp(tarB.start);

        this.updateTwoPointMetrics();
        this.showToast('Auto-detected Start & End Anchors', 'info');
    }

    updateTwoPointMetrics() {
        const tA_ref = this.parseTimestampToSeconds(this.anchorA_ref.value);
        const tA_tar = this.parseTimestampToSeconds(this.anchorA_target.value);
        const tB_ref = this.parseTimestampToSeconds(this.anchorB_ref.value);
        const tB_tar = this.parseTimestampToSeconds(this.anchorB_target.value);

        if (tB_tar === tA_tar || isNaN(tA_ref) || isNaN(tA_tar) || isNaN(tB_ref) || isNaN(tB_tar)) {
            this.metricRatio.textContent = '1.00000x';
            this.metricOffset.textContent = '+0.000s';
            return { scale: 1, offset: 0, valid: false };
        }

        const scale = (tB_ref - tA_ref) / (tB_tar - tA_tar);
        const offset = tA_ref - (tA_tar * scale);

        this.metricRatio.textContent = `${scale.toFixed(5)}x`;
        this.metricOffset.textContent = `${offset >= 0 ? '+' : ''}${offset.toFixed(3)}s`;

        return { scale, offset, valid: true };
    }

    applyTwoPointSync() {
        const metrics = this.updateTwoPointMetrics();
        if (!metrics.valid) {
            this.showToast('Please check the Anchor timestamps. Target times must be different.', 'error');
            return;
        }

        const { scale, offset } = metrics;

        this.state.targetCues.forEach(cue => {
            cue.start = Math.max(0, cue.start * scale + offset);
            cue.end = Math.max(cue.start + 0.1, cue.end * scale + offset);
            cue.startStr = this.formatSecondsToTimestamp(cue.start);
            cue.endStr = this.formatSecondsToTimestamp(cue.end);
        });

        this.pushHistoryState(`Applied 2-Point Sync (Scale: ${scale.toFixed(4)}x, Offset: ${offset.toFixed(2)}s)`);
        this.renderSubtitles();
        this.updateTotalDuration();
    }

    // --- Global Shift Logic ---
    applyShift(seconds) {
        if (!this.state.targetCues.length) return;

        this.state.targetCues.forEach(cue => {
            cue.start = Math.max(0, cue.start + seconds);
            cue.end = Math.max(cue.start + 0.1, cue.end + seconds);
            cue.startStr = this.formatSecondsToTimestamp(cue.start);
            cue.endStr = this.formatSecondsToTimestamp(cue.end);
        });

        this.pushHistoryState(`Shifted all subtitles by ${seconds > 0 ? '+' : ''}${seconds}s`);
        this.renderSubtitles();
        this.updateTotalDuration();
    }

    quickShift(seconds) {
        this.applyShift(seconds);
    }

    // --- Speed / FPS Multiplier Logic ---
    applyFpsRatio(fromFps, toFps) {
        const multiplier = fromFps / toFps;
        this.speedMultiplierInput.value = multiplier.toFixed(5);
        this.applySpeedMultiplier(multiplier, `${fromFps} fps -> ${toFps} fps`);
    }

    applySpeedMultiplier(multiplier, label = '') {
        if (!this.state.targetCues.length) return;

        this.state.targetCues.forEach(cue => {
            cue.start = cue.start * multiplier;
            cue.end = cue.end * multiplier;
            cue.startStr = this.formatSecondsToTimestamp(cue.start);
            cue.endStr = this.formatSecondsToTimestamp(cue.end);
        });

        this.pushHistoryState(`Applied speed multiplier ${multiplier.toFixed(5)}x ${label ? `(${label})` : ''}`);
        this.renderSubtitles();
        this.updateTotalDuration();
    }

    // --- Section Shift Logic ---
    applySectionShift() {
        const startCueNum = parseInt(this.sectionStartCue.value, 10) || 1;
        const startTimeStr = this.sectionStartTime.value.trim();
        const shiftOffset = parseFloat(this.sectionShiftOffset.value);

        if (isNaN(shiftOffset) || shiftOffset === 0) {
            this.showToast('Please enter a valid shift offset in seconds', 'error');
            return;
        }

        let minTime = 0;
        if (startTimeStr) {
            minTime = this.parseTimestampToSeconds(startTimeStr);
        }

        let modifiedCount = 0;
        this.state.targetCues.forEach((cue, index) => {
            const cueNumber = index + 1;
            if (cueNumber >= startCueNum || (minTime > 0 && cue.start >= minTime)) {
                cue.start = Math.max(0, cue.start + shiftOffset);
                cue.end = Math.max(cue.start + 0.1, cue.end + shiftOffset);
                cue.startStr = this.formatSecondsToTimestamp(cue.start);
                cue.endStr = this.formatSecondsToTimestamp(cue.end);
                modifiedCount++;
            }
        });

        this.pushHistoryState(`Shifted ${modifiedCount} subtitles from Cue #${startCueNum} by ${shiftOffset > 0 ? '+' : ''}${shiftOffset}s`);
        this.renderSubtitles();
        this.updateTotalDuration();
    }

    // --- 1-to-1 Direct Transfer Logic ---
    applyDirectTransfer() {
        if (!this.state.refCues.length || !this.state.targetCues.length) {
            this.showToast('Both Reference and Target subtitles must be loaded', 'error');
            return;
        }

        const count = Math.min(this.state.refCues.length, this.state.targetCues.length);
        if (!confirm(`Are you sure you want to copy timestamps 1-to-1 from the first ${count} Reference cues onto Target cues?`)) {
            return;
        }

        for (let i = 0; i < count; i++) {
            this.state.targetCues[i].start = this.state.refCues[i].start;
            this.state.targetCues[i].end = this.state.refCues[i].end;
            this.state.targetCues[i].startStr = this.formatSecondsToTimestamp(this.state.refCues[i].start);
            this.state.targetCues[i].endStr = this.formatSecondsToTimestamp(this.state.refCues[i].end);
        }

        this.pushHistoryState(`Directly transferred timestamps for ${count} cues`);
        this.renderSubtitles();
        this.updateTotalDuration();
    }

    // --- Individual Cue Adjustments ---
    nudgeIndividualCue(cueIndex, deltaSec) {
        if (cueIndex < 0 || cueIndex >= this.state.targetCues.length) return;
        const cue = this.state.targetCues[cueIndex];
        cue.start = Math.max(0, cue.start + deltaSec);
        cue.end = Math.max(cue.start + 0.1, cue.end + deltaSec);
        cue.startStr = this.formatSecondsToTimestamp(cue.start);
        cue.endStr = this.formatSecondsToTimestamp(cue.end);

        this.pushHistoryState(`Nudged Cue #${cueIndex + 1} by ${deltaSec > 0 ? '+' : ''}${deltaSec}s`);
        this.renderSubtitles();
    }

    setAnchorFromCue(cue, point, source) {
        const timeStr = this.formatSecondsToTimestamp(cue.start);
        if (point === 'A') {
            if (source === 'ref') this.anchorA_ref.value = timeStr;
            else this.anchorA_target.value = timeStr;
        } else {
            if (source === 'ref') this.anchorB_ref.value = timeStr;
            else this.anchorB_target.value = timeStr;
        }

        this.updateTwoPointMetrics();
        this.showToast(`Set Anchor ${point} (${source.toUpperCase()}) to ${timeStr}`, 'info');

        const tabBtn = document.querySelector('[data-tab="twoPointTab"]');
        if (tabBtn && !tabBtn.classList.contains('active')) {
            tabBtn.click();
        }
    }

    // ==========================================
    // UI RENDERING
    // ==========================================

    renderSubtitles() {
        const filter = this.state.filterText;
        const showDiff = this.state.showDiffBadges;

        // Render Reference Subtitles
        this.colRefCount.textContent = `${this.state.refCues.length} Cues`;
        if (this.state.refCues.length === 0) {
            this.refSubList.innerHTML = '<div class="empty-placeholder">Drop Reference SRT file here</div>';
        } else {
            const refHtml = [];
            let refVisibleCount = 0;

            this.state.refCues.forEach((cue, i) => {
                const matchFilter = !filter || 
                    cue.text.toLowerCase().includes(filter) || 
                    cue.startStr.includes(filter) || 
                    String(cue.idx).includes(filter);

                if (!matchFilter) return;
                refVisibleCount++;

                refHtml.push(`
                    <div class="sub-card" id="refCard_${i}" data-index="${i}">
                        <div class="sub-card-header">
                            <div class="cue-meta">
                                <span class="cue-num">#${cue.idx}</span>
                                <span class="cue-time">${cue.startStr} &rarr; ${cue.endStr}</span>
                            </div>
                            <div class="cue-actions">
                                <button class="btn btn-sm btn-ghost" title="Set as Anchor A" onclick="app.setAnchorFromCue(app.state.refCues[${i}], 'A', 'ref')">Set A</button>
                                <button class="btn btn-sm btn-ghost" title="Set as Anchor B" onclick="app.setAnchorFromCue(app.state.refCues[${i}], 'B', 'ref')">Set B</button>
                                <button class="btn btn-sm btn-ghost" title="Seek player here" onclick="app.seekTo(${cue.start})">&#9654;</button>
                            </div>
                        </div>
                        <div class="cue-text">${this.escapeHtml(cue.text)}</div>
                    </div>
                `);
            });

            this.refSubList.innerHTML = refHtml.length ? refHtml.join('') : '<div class="empty-placeholder">No matching subtitles found</div>';
        }

        // Render Target Subtitles
        this.colTargetCount.textContent = `${this.state.targetCues.length} Cues`;
        if (this.state.targetCues.length === 0) {
            this.targetSubList.innerHTML = '<div class="empty-placeholder">Drop Target SRT file here</div>';
        } else {
            const targetHtml = [];
            let targetVisibleCount = 0;

            this.state.targetCues.forEach((cue, i) => {
                const matchFilter = !filter || 
                    cue.text.toLowerCase().includes(filter) || 
                    cue.startStr.includes(filter) || 
                    String(cue.idx).includes(filter);

                if (!matchFilter) return;
                targetVisibleCount++;

                // Calculate difference with matching index in reference if available
                let diffBadgeHtml = '';
                if (showDiff && this.state.refCues[i]) {
                    const diffSec = cue.start - this.state.refCues[i].start;
                    const diffFormatted = `${diffSec >= 0 ? '+' : ''}${diffSec.toFixed(2)}s`;
                    const absDiff = Math.abs(diffSec);
                    let diffClass = 'diff-synced';
                    if (absDiff > 2.0) diffClass = 'diff-danger';
                    else if (absDiff > 0.5) diffClass = 'diff-warning';

                    diffBadgeHtml = `<span class="offset-diff-badge ${diffClass}" title="Offset vs Reference #${i+1}">Δ ${diffFormatted}</span>`;
                }

                targetHtml.push(`
                    <div class="sub-card" id="targetCard_${i}" data-index="${i}">
                        <div class="sub-card-header">
                            <div class="cue-meta">
                                <span class="cue-num">#${cue.idx}</span>
                                <span class="cue-time">${cue.startStr} &rarr; ${cue.endStr}</span>
                                ${diffBadgeHtml}
                            </div>
                            <div class="cue-actions">
                                <button class="btn btn-sm btn-ghost" title="Nudge back 200ms" onclick="app.nudgeIndividualCue(${i}, -0.2)">-0.2s</button>
                                <button class="btn btn-sm btn-ghost" title="Nudge forward 200ms" onclick="app.nudgeIndividualCue(${i}, +0.2)">+0.2s</button>
                                <button class="btn btn-sm btn-ghost" title="Set as Anchor A" onclick="app.setAnchorFromCue(app.state.targetCues[${i}], 'A', 'target')">Set A</button>
                                <button class="btn btn-sm btn-ghost" title="Set as Anchor B" onclick="app.setAnchorFromCue(app.state.targetCues[${i}], 'B', 'target')">Set B</button>
                                <button class="btn btn-sm btn-ghost" title="Seek player here" onclick="app.seekTo(${cue.start})">&#9654;</button>
                            </div>
                        </div>
                        <div class="cue-text sinhala-font">${this.escapeHtml(cue.text)}</div>
                    </div>
                `);
            });

            this.targetSubList.innerHTML = targetHtml.length ? targetHtml.join('') : '<div class="empty-placeholder">No matching subtitles found</div>';
        }

        const total = Math.max(this.state.refCues.length, this.state.targetCues.length);
        this.visibleCounter.textContent = filter ? `Filtered results` : `${total} cues total`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==========================================
    // LIVE PLAYER SIMULATION
    // ==========================================

    togglePlayPause() {
        if (this.state.isPlaying) {
            this.pausePlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (this.state.maxDuration <= 0) return;
        this.state.isPlaying = true;
        this.playIcon.style.display = 'none';
        this.pauseIcon.style.display = 'block';
        this.state.lastFrameTime = performance.now();

        const tick = (now) => {
            if (!this.state.isPlaying) return;
            const deltaSec = (now - this.state.lastFrameTime) / 1000 * this.state.playbackSpeed;
            this.state.lastFrameTime = now;
            
            this.state.currentTime += deltaSec;
            if (this.state.currentTime >= this.state.maxDuration) {
                this.state.currentTime = this.state.maxDuration;
                this.stopPlayback();
                return;
            }

            this.updatePlayerUI();
            this.state.timerId = requestAnimationFrame(tick);
        };

        this.state.timerId = requestAnimationFrame(tick);
    }

    pausePlayback() {
        this.state.isPlaying = false;
        if (this.state.timerId) cancelAnimationFrame(this.state.timerId);
        this.playIcon.style.display = 'block';
        this.pauseIcon.style.display = 'none';
    }

    stopPlayback() {
        this.pausePlayback();
        this.seekTo(0);
    }

    seekTo(seconds) {
        this.state.currentTime = Math.max(0, Math.min(seconds, this.state.maxDuration));
        this.updatePlayerUI();
    }

    updatePlayerUI() {
        const cur = this.state.currentTime;
        this.timelineSlider.value = cur;
        this.playerCurrentTime.textContent = this.formatSecondsToTimestamp(cur);

        // Find active cues
        const activeRef = this.state.refCues.find(c => cur >= c.start && cur <= c.end);
        const activeTarget = this.state.targetCues.find(c => cur >= c.start && cur <= c.end);

        this.liveRefText.innerHTML = activeRef ? this.escapeHtml(activeRef.text) : '<em>No subtitle at current time</em>';
        this.liveTargetText.innerHTML = activeTarget ? this.escapeHtml(activeTarget.text) : '<em>No subtitle at current time</em>';

        // Highlight active cards in lists if visible
        document.querySelectorAll('.sub-card.active-playback').forEach(el => el.classList.remove('active-playback'));
        
        if (activeRef) {
            const refIdx = this.state.refCues.indexOf(activeRef);
            const card = document.getElementById(`refCard_${refIdx}`);
            if (card) card.classList.add('active-playback');
        }

        if (activeTarget) {
            const tarIdx = this.state.targetCues.indexOf(activeTarget);
            const card = document.getElementById(`targetCard_${tarIdx}`);
            if (card) card.classList.add('active-playback');
        }
    }

    // ==========================================
    // EXPORT & DOWNLOAD
    // ==========================================

    openExportModal() {
        if (!this.state.targetCues.length) return;
        const srtContent = this.generateSRT(this.state.targetCues);
        this.rawSrtOutput.value = srtContent;

        const originalName = this.state.targetFile ? this.state.targetFile.name : 'subtitles.srt';
        const fixedName = originalName.replace(/\.srt$/i, '') + '_fixed.srt';

        this.exportSummary.innerHTML = `
            <div><strong>File:</strong> ${fixedName}</div>
            <div><strong>Total Cues:</strong> ${this.state.targetCues.length}</div>
            <div><strong>Duration:</strong> ${this.formatSecondsToTimestamp(this.state.targetCues[this.state.targetCues.length - 1].end)}</div>
        `;

        this.exportModal.classList.add('open');
    }

    closeExportModal() {
        this.exportModal.classList.remove('open');
    }

    copyFixedSrtToClipboard() {
        const text = this.rawSrtOutput.value;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied fixed SRT to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy. Please copy manually from the box.', 'error');
        });
    }

    downloadFixedSrt() {
        if (!this.state.targetCues.length) return;
        const srtContent = this.generateSRT(this.state.targetCues);
        const originalName = this.state.targetFile ? this.state.targetFile.name : 'sinhala.srt';
        const fixedName = originalName.replace(/\.srt$/i, '') + '_fixed.srt';

        // Prepend UTF-8 BOM so media players like VLC, Windows Media Player, etc. display Sinhala script flawlessly
        const blob = new Blob(['\uFEFF' + srtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fixedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast(`Downloaded ${fixedName}`, 'success');
        this.closeExportModal();
    }

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================

    showToast(message, type = 'info') {
        const container = document.getElementById('toast');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#10b981" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>';
        } else if (type === 'error') {
            iconSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
        } else {
            iconSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }

        toast.innerHTML = `${iconSvg} <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    }
}

// Instantiate on DOM load
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SubtitleFixerApp();
    // Auto-load local sample files if available
    app.loadSampleData();
});