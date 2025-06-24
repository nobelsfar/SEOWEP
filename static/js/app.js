// Professional SEO Generator - Enhanced Web Application
class SEOGenerator {
    constructor() {
        console.log('SEOGenerator constructor called');
        this.currentProfile = null;
        this.profiles = {};
        this.products = {};
        this.savedTexts = {};
        this.generatedTexts = [];
        this.currentTextIndex = 0;
        this.quillEditor = null;
        this.isEditMode = true; // Initialize edit mode - start in edit mode by default
        this.isFormatting = false; // Track if user is currently formatting
        this.undoStack = []; // Store content history for undo
        this.redoStack = []; // Store content for redo
        this.maxUndoSteps = 20; // Maximum undo steps
        this.isUploading = false; // Prevent duplicate Shopify uploads
        this.selectedImage = null; // Currently selected image
        this.shopifyImages = []; // Loaded Shopify images
        this.featuredImageUrl = null; // Featured image URL for Shopify upload
        this.featuredImageAlt = null; // Featured image alt text for Shopify upload
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing SEO Generator...');
        
        await this.loadInitialData();
        this.setupEventListeners();
        this.initializeWebsitePreview();
        this.initializePreviewTabs();
        this.initializeProfileTabs();
        
        // Initialize resizable splitter
        this.initializeResizableSplitter();
        
        this.setupUndoRedoButtons();
        this.setupEditingToolbar();
        this.initBatchGeneration();
        this.showTab('generator');
        
        console.log('✅ SEO Generator initialized successfully');
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.showTab(tabName);
            });
        });

        // Generate SEO button
        const generateBtn = document.getElementById('generate-btn');
        console.log('Generate button found:', generateBtn);
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                console.log('Generate button clicked!');
                this.generateSEO();
            });
            console.log('Generate button event listener attached');
        } else {
            console.error('Generate button not found!');
        }

        // Generate variations button
        const variationsBtn = document.getElementById('generate-variations-btn');
        if (variationsBtn) {
            variationsBtn.addEventListener('click', () => {
                this.generateSEOVariations();
            });
        }

        // Save text button
        const saveTextBtn = document.getElementById('save-text-btn');
        if (saveTextBtn) {
            saveTextBtn.addEventListener('click', () => {
                this.saveGeneratedText();
            });
        }

        // Toggle edit mode button
        const toggleEditBtn = document.getElementById('toggle-edit-mode-btn');
        if (toggleEditBtn) {
            toggleEditBtn.addEventListener('click', () => {
                this.toggleEditMode();
            });
        }

        // Initialize resizable splitter
        this.initializeResizableSplitter();

        // Copy buttons
        const copyTextBtn = document.getElementById('copy-text-btn');
        if (copyTextBtn) {
            copyTextBtn.addEventListener('click', () => {
                this.copyToClipboard('text');
            });
        }

        const copyHtmlBtn = document.getElementById('copy-html-btn');
        if (copyHtmlBtn) {
            copyHtmlBtn.addEventListener('click', () => {
                this.copyToClipboard('html');
            });
        }

        // Preview tab buttons
        const saveEditedBtn = document.getElementById('save-edited-text-btn');
        if (saveEditedBtn) {
            saveEditedBtn.addEventListener('click', () => {
                this.saveEditedText();
            });
        }

        const copyPreviewBtn = document.getElementById('copy-preview-html-btn');
        if (copyPreviewBtn) {
            copyPreviewBtn.addEventListener('click', () => {
                this.copyPreviewHTML();
            });
        }

        const uploadShopifyBtn = document.getElementById('upload-to-shopify-btn');
        if (uploadShopifyBtn) {
            uploadShopifyBtn.addEventListener('click', () => {
                this.uploadToShopify();
            });
        }



        // Clear preview list button
        const clearPreviewBtn = document.getElementById('clear-preview-btn');
        if (clearPreviewBtn) {
            clearPreviewBtn.addEventListener('click', () => {
                this.clearPreviewList();
            });
        }

        // Load to preview button (for saved texts in preview tab)
        const loadToPreviewBtn = document.getElementById('load-to-preview-btn');
        if (loadToPreviewBtn) {
            loadToPreviewBtn.addEventListener('click', () => {
                this.loadSelectedTextToPreview();
            });
        }

        // Copy HTML code button
        const copyHtmlCodeBtn = document.getElementById('copy-html-code-btn');
        if (copyHtmlCodeBtn) {
            copyHtmlCodeBtn.addEventListener('click', () => {
                this.copyHTMLCode();
            });
        }

        // Format HTML button
        const formatHtmlBtn = document.getElementById('format-html-btn');
        if (formatHtmlBtn) {
            formatHtmlBtn.addEventListener('click', () => {
                this.formatHTMLCode();
            });
        }

        // Preview selector dropdown
        const previewSelector = document.getElementById('preview-selector');
        if (previewSelector) {
            previewSelector.addEventListener('change', (e) => {
                const index = parseInt(e.target.value);
                if (!isNaN(index)) {
                    this.loadTextIntoEditor(index);
                }
            });
        }

        // Settings buttons
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        // Saved texts filtering and sorting
        const textSearchInput = document.getElementById('text-search');
        if (textSearchInput) {
            textSearchInput.addEventListener('input', () => {
                this.filterSavedTexts();
            });
        }

        const dateFrom = document.getElementById('date-from');
        if (dateFrom) {
            dateFrom.addEventListener('change', () => {
                this.filterSavedTexts();
            });
        }

        const dateTo = document.getElementById('date-to');
        if (dateTo) {
            dateTo.addEventListener('change', () => {
                this.filterSavedTexts();
            });
        }

        const sortOrder = document.getElementById('sort-order');
        if (sortOrder) {
            sortOrder.addEventListener('change', () => {
                this.filterSavedTexts();
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        const resetApiBtn = document.getElementById('reset-api-key-btn');
        if (resetApiBtn) {
            resetApiBtn.addEventListener('click', () => {
                this.resetApiKey();
            });
        }

        // Profile management
        const addProfileBtn = document.getElementById('add-profile-btn');
        if (addProfileBtn) {
            addProfileBtn.addEventListener('click', () => {
                this.addProfile();
            });
        }

        const saveProfileBtn = document.getElementById('save-profile-btn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                this.saveProfile();
            });
        }

        const deleteProfileBtn = document.getElementById('delete-profile-btn');
        if (deleteProfileBtn) {
            deleteProfileBtn.addEventListener('click', () => {
                this.deleteProfile();
            });
        }

        // Import/Export profile buttons
        const importProfilesBtn = document.getElementById('import-profiles-btn');
        if (importProfilesBtn) {
            importProfilesBtn.addEventListener('click', () => {
                this.importProfiles();
            });
        }

        const exportProfilesBtn = document.getElementById('export-profiles-btn');
        if (exportProfilesBtn) {
            exportProfilesBtn.addEventListener('click', () => {
                this.exportProfiles();
            });
        }

        // Product management buttons
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                this.showProductModal();
            });
        }

        const fetchUrlsBtn = document.getElementById('fetch-urls-btn');
        if (fetchUrlsBtn) {
            fetchUrlsBtn.addEventListener('click', () => {
                this.fetchProductsFromURLs();
            });
        }

        // Product modal event listeners
        const saveProductBtn = document.getElementById('save-product-btn');
        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', () => {
                this.saveProductFromModal();
            });
        }

        const cancelProductBtn = document.getElementById('cancel-product-btn');
        if (cancelProductBtn) {
            cancelProductBtn.addEventListener('click', () => {
                this.hideModal('product-modal');
            });
        }

        // Close modal when clicking X or outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close') && e.target.closest('#product-modal')) {
                this.hideModal('product-modal');
            }
            if (e.target.id === 'product-modal') {
                this.hideModal('product-modal');
            }
        });

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showModal('settings-modal');
            });
        }

        // Settings modal close button
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            const closeBtn = settingsModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideModal('settings-modal');
                });
            }
            
            // Close modal when clicking outside
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.hideModal('settings-modal');
                }
            });
        }

        // Profile selector
        const profileSelect = document.getElementById('profile-select');
        if (profileSelect) {
            profileSelect.addEventListener('change', (e) => {
                this.selectProfile(e.target.value);
            });
        }

        // Product selection checkboxes - just log the selection, don't update the list
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.name === 'product') {
                console.log('Product selection changed:', e.target.value, 'checked:', e.target.checked);
                // Don't call updateProductSelection() here as it recreates all checkboxes!
            }
        });

        // Revision request
        const reviseBtn = document.getElementById('revise-btn');
        if (reviseBtn) {
            reviseBtn.addEventListener('click', () => {
                this.requestRevision();
            });
        }

        // Image insertion button
        const insertImageBtn = document.getElementById('insert-image-btn');
        if (insertImageBtn) {
            insertImageBtn.addEventListener('click', () => {
                this.showImageModal();
            });
        }

        // Shopify test connection button
        const testShopifyBtn = document.getElementById('test-shopify-connection-btn');
        if (testShopifyBtn) {
            testShopifyBtn.addEventListener('click', () => {
                this.testShopifyConnection();
            });
        }

        // Browse Shopify images button
        const browseShopifyImagesBtn = document.getElementById('browse-shopify-images-btn');
        if (browseShopifyImagesBtn) {
            browseShopifyImagesBtn.addEventListener('click', () => {
                this.browseShopifyImages();
            });
        }

        // Image modal event listeners
        this.setupImageModalListeners();

        // Search functionality for saved texts
        const textSearch = document.getElementById('text-search');
        if (textSearch) {
            textSearch.addEventListener('input', (e) => {
                this.filterSavedTexts(e.target.value);
            });
        }

        // Refresh texts button
        const refreshTextsBtn = document.getElementById('refresh-texts-btn');
        if (refreshTextsBtn) {
            refreshTextsBtn.addEventListener('click', () => {
                this.loadSavedTexts();
            });
        }

        // Edit and delete buttons for saved texts
        const editSelectedBtn = document.getElementById('edit-selected-text-btn');
        if (editSelectedBtn) {
            editSelectedBtn.addEventListener('click', () => {
                this.editSelectedText();
            });
        }

        const deleteSelectedBtn = document.getElementById('delete-selected-text-btn');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                this.deleteSelectedText();
            });
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Initialize website preview and editing toolbar
        this.initializeWebsitePreview();
        this.setupEditingToolbar();

        // Translator listeners
        this.setupTranslatorListeners();
    }

    setupImageModalListeners() {
        // Image modal close buttons
        const imageModal = document.getElementById('image-modal');
        if (imageModal) {
            const closeBtn = imageModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideModal('image-modal');
                });
            }
            
            // Close modal when clicking outside
            imageModal.addEventListener('click', (e) => {
                if (e.target === imageModal) {
                    this.hideModal('image-modal');
                }
            });
        }

        // Image tab switching
        document.querySelectorAll('.image-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.showImageTab(tabName);
            });
        });

        // Upload image button
        const uploadImageBtn = document.getElementById('upload-image-btn');
        const imageUpload = document.getElementById('image-upload');
        if (uploadImageBtn && imageUpload) {
            uploadImageBtn.addEventListener('click', () => {
                imageUpload.click();
            });
            
            imageUpload.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files[0]);
            });
        }

        // Insert selected image button
        const insertSelectedImageBtn = document.getElementById('insert-selected-image-btn');
        if (insertSelectedImageBtn) {
            insertSelectedImageBtn.addEventListener('click', () => {
                this.insertSelectedImage();
            });
        }

        // Cancel image selection button
        const cancelImageBtn = document.getElementById('cancel-image-selection-btn');
        if (cancelImageBtn) {
            cancelImageBtn.addEventListener('click', () => {
                this.hideModal('image-modal');
            });
        }

        // Refresh Shopify images button
        const refreshShopifyImagesBtn = document.getElementById('refresh-shopify-images-btn');
        if (refreshShopifyImagesBtn) {
            refreshShopifyImagesBtn.addEventListener('click', () => {
                this.loadShopifyImages();
            });
        }

        // Shopify image search
        const shopifyImageSearch = document.getElementById('shopify-image-search');
        if (shopifyImageSearch) {
            shopifyImageSearch.addEventListener('input', (e) => {
                this.filterShopifyImages(e.target.value);
            });
        }
    }

    initializeWebsitePreview() {
        // Initialize edit mode state - start in edit mode by default
        this.isEditMode = true;
        
        // Set up contenteditable functionality
        const previewTitle = document.getElementById('preview-title');
        const previewContent = document.getElementById('preview-content');
        const toggleBtn = document.getElementById('toggle-edit-mode-btn');
        const saveBtn = document.getElementById('save-edited-text-btn');
        
        // Start in edit mode (editable by default)
        if (previewTitle) {
            previewTitle.setAttribute('contenteditable', 'true');
            previewTitle.classList.add('edit-mode');
        }
        if (previewContent) {
            previewContent.setAttribute('contenteditable', 'true');
            previewContent.classList.add('edit-mode');
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = '👁️ Preview';
            toggleBtn.classList.remove('btn-secondary');
            toggleBtn.classList.add('btn-primary');
        }
        if (saveBtn) {
            saveBtn.style.display = 'inline-block';
        }
        
        // Sync title changes with meta-title field
        if (previewTitle) {
            previewTitle.addEventListener('input', () => {
                const metaTitle = document.getElementById('meta-title');
                if (metaTitle) {
                    metaTitle.value = previewTitle.textContent.trim();
                }
                // Update HTML display when title changes
                this.updateHTMLDisplay();
                // Auto-save
                this.autoSaveContent();
            });
            
            // Save state on focus (before editing starts)
            previewTitle.addEventListener('focus', () => {
                this.saveUndoState();
            });
        }

        // Update HTML display when content changes
        if (previewContent) {
            previewContent.addEventListener('input', () => {
                this.updateHTMLDisplay();
                // Auto-save
                this.autoSaveContent();
            });
            
            // Save state on focus (before editing starts)
            previewContent.addEventListener('focus', () => {
                this.saveUndoState();
            });
        }
        
        // Add auto-save for paste events
        if (previewTitle) {
            previewTitle.addEventListener('paste', () => {
                setTimeout(() => this.autoSaveContent(), 100);
            });
        }
        if (previewContent) {
            previewContent.addEventListener('paste', () => {
                setTimeout(() => this.autoSaveContent(), 100);
            });
        }
        
        // Set up toolbar functionality
        this.setupEditingToolbar();
        
        // Setup undo/redo buttons
        this.setupUndoRedoButtons();
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only allow shortcuts in edit mode
            if (!this.isEditMode) return;
            
            const previewContent = document.getElementById('preview-content');
            const previewTitle = document.getElementById('preview-title');
            
            // Check if we're in an editable area
            const activeElement = document.activeElement;
            if (activeElement !== previewContent && activeElement !== previewTitle) return;
            
            // Undo: Ctrl+Z (Cmd+Z on Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }
            
            // Redo: Ctrl+Y or Ctrl+Shift+Z (Cmd+Y or Cmd+Shift+Z on Mac)
            if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')) {
                e.preventDefault();
                this.redo();
                return;
            }
            
            // Save state before formatting shortcuts
            let shouldSaveState = false;
            
            // Ctrl+B for bold
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                this.saveUndoState();
                this.applyFormatting('bold');
            }
            // Ctrl+I for italic
            else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                e.preventDefault();
                this.saveUndoState();
                this.applyFormatting('italic');
            }
            // Ctrl+U for underline
            else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                this.saveUndoState();
                this.applyFormatting('underline');
            }
        });
    }

    toggleEditMode() {
        const previewTitle = document.getElementById('preview-title');
        const previewContent = document.getElementById('preview-content');
        const toggleBtn = document.getElementById('toggle-edit-mode-btn');
        const saveBtn = document.getElementById('save-edited-text-btn');
        
        this.isEditMode = !this.isEditMode;
        
        if (this.isEditMode) {
            // Switch to edit mode
            if (previewTitle) {
                previewTitle.setAttribute('contenteditable', 'true');
                previewTitle.classList.remove('preview-mode');
                previewTitle.classList.add('edit-mode');
            }
            if (previewContent) {
                previewContent.setAttribute('contenteditable', 'true');
                previewContent.classList.remove('preview-mode');
                previewContent.classList.add('edit-mode');
            }
            if (toggleBtn) {
                toggleBtn.innerHTML = '👁️ Preview';
                toggleBtn.classList.remove('btn-secondary');
                toggleBtn.classList.add('btn-primary');
            }
            if (saveBtn) {
                saveBtn.style.display = 'inline-block';
            }
            
            this.showToast('Redigeringstilstand aktiveret', 'success');
        } else {
            // Switch to preview mode
            if (previewTitle) {
                previewTitle.setAttribute('contenteditable', 'false');
                previewTitle.classList.remove('edit-mode');
                previewTitle.classList.add('preview-mode');
            }
            if (previewContent) {
                previewContent.setAttribute('contenteditable', 'false');
                previewContent.classList.remove('edit-mode');
                previewContent.classList.add('preview-mode');
            }
            if (toggleBtn) {
                toggleBtn.innerHTML = '✏️ Rediger';
                toggleBtn.classList.remove('btn-primary');
                toggleBtn.classList.add('btn-secondary');
            }
            if (saveBtn) {
                saveBtn.style.display = 'none';
            }
            
            this.showToast('Forhåndsvisningstilstand aktiveret', 'success');
        }
        
        // Update HTML display
        this.updateHTMLDisplay();
    }

    autoSaveContent() {
        if (!this.isEditMode || !this.currentTextName || this.isFormatting) return;
        
        // Don't auto-save if user is currently selecting text or formatting
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed) {
            return; // User has text selected, don't interrupt
        }
        
        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        // Set new timeout for auto-save (increased to 5 seconds to be less intrusive)
        this.autoSaveTimeout = setTimeout(async () => {
            try {
                // Save current selection state
                const activeElement = document.activeElement;
                const selection = window.getSelection();
                let savedRange = null;
                
                if (selection.rangeCount > 0) {
                    savedRange = selection.getRangeAt(0).cloneRange();
                }
                
                const previewTitle = document.getElementById('preview-title');
                const previewContent = document.getElementById('preview-content');
                
                const title = previewTitle ? previewTitle.textContent.trim() : '';
                const content = previewContent ? previewContent.innerHTML.trim() : '';
                
                if (title || content) {
                    const response = await fetch('/api/auto-save-text', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: this.currentTextName,
                            title: title,
                            content: content
                        })
                    });
                    
                    if (response.ok) {
                        this.showAutoSaveIndicator();
                        // Don't reload saved texts during editing to avoid interruption
                        // await this.loadSavedTexts();
                    }
                }
                
                // Restore selection state
                if (savedRange && activeElement) {
                    try {
                        activeElement.focus();
                        selection.removeAllRanges();
                        selection.addRange(savedRange);
                    } catch (e) {
                        // Ignore restoration errors
                    }
                }
            } catch (error) {
                console.error('Auto-save error:', error);
            }
        }, 5000); // Auto-save after 5 seconds of inactivity
    }

    showAutoSaveIndicator() {
        // Create or update auto-save indicator
        let indicator = document.getElementById('auto-save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'auto-save-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            indicator.textContent = '✓ Gemt automatisk';
            document.body.appendChild(indicator);
        }
        
        // Show and hide indicator
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 2000);
    }

    initializeResizableSplitter() {
        const splitter = document.getElementById('splitter');
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const generatorLayout = document.querySelector('.generator-layout');
        
        if (!splitter || !leftPanel || !rightPanel || !generatorLayout) return;
        
        let isResizing = false;
        let startX = 0;
        let startLeftWidth = 0;
        
        splitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startLeftWidth = leftPanel.offsetWidth;
            
            generatorLayout.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const containerWidth = generatorLayout.offsetWidth;
            const splitterWidth = splitter.offsetWidth;
            const deltaX = e.clientX - startX;
            const newLeftWidth = startLeftWidth + deltaX;
            
            // Calculate percentages
            const minLeftWidth = 300; // minimum 300px
            const maxLeftWidth = containerWidth * 0.7; // maximum 70%
            const minRightWidth = 300; // minimum 300px for right panel
            
            // Ensure constraints
            if (newLeftWidth >= minLeftWidth && 
                newLeftWidth <= maxLeftWidth && 
                (containerWidth - newLeftWidth - splitterWidth) >= minRightWidth) {
                
                const leftPercentage = (newLeftWidth / containerWidth) * 100;
                leftPanel.style.flex = `0 0 ${leftPercentage}%`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                generatorLayout.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Save the current layout to localStorage
                const leftPercentage = (leftPanel.offsetWidth / generatorLayout.offsetWidth) * 100;
                localStorage.setItem('seo-generator-left-panel-width', leftPercentage.toString());
            }
        });
        
        // Restore saved layout on page load
        const savedWidth = localStorage.getItem('seo-generator-left-panel-width');
        if (savedWidth) {
            leftPanel.style.flex = `0 0 ${savedWidth}%`;
        }
        
        // Handle double-click to reset to 50/50
        splitter.addEventListener('dblclick', () => {
            leftPanel.style.flex = '0 0 50%';
            localStorage.setItem('seo-generator-left-panel-width', '50');
            this.showToast('Layout nulstillet til 50/50', 'success');
        });
    }

    initializeSavedTextsResizableSplitter() {
        const splitter = document.getElementById('texts-splitter');
        const leftPanel = document.getElementById('texts-left-panel');
        const rightPanel = document.getElementById('texts-right-panel');
        const savedTextsLayout = document.querySelector('#preview .generator-layout');
        
        if (!splitter || !leftPanel || !rightPanel || !savedTextsLayout) {
            console.log('Saved texts splitter elements not found:', {
                splitter: !!splitter,
                leftPanel: !!leftPanel, 
                rightPanel: !!rightPanel,
                savedTextsLayout: !!savedTextsLayout
            });
            return;
        }
        
        let isResizing = false;
        let startX = 0;
        let startLeftWidth = 0;
        
        splitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startLeftWidth = leftPanel.offsetWidth;
            
            savedTextsLayout.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const containerWidth = savedTextsLayout.offsetWidth;
            const splitterWidth = splitter.offsetWidth;
            const deltaX = e.clientX - startX;
            const newLeftWidth = startLeftWidth + deltaX;
            
            // Calculate percentages
            const minLeftWidth = 250; // minimum 250px for text list
            const maxLeftWidth = containerWidth * 0.7; // maximum 70%
            const minRightWidth = 300; // minimum 300px for preview panel
            
            // Ensure constraints
            if (newLeftWidth >= minLeftWidth && 
                newLeftWidth <= maxLeftWidth && 
                (containerWidth - newLeftWidth - splitterWidth) >= minRightWidth) {
                
                const leftPercentage = (newLeftWidth / containerWidth) * 100;
                leftPanel.style.flex = `0 0 ${leftPercentage}%`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                savedTextsLayout.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Save the current layout to localStorage
                const leftPercentage = (leftPanel.offsetWidth / savedTextsLayout.offsetWidth) * 100;
                localStorage.setItem('saved-texts-left-panel-width', leftPercentage.toString());
            }
        });
        
        // Restore saved layout on page load
        const savedWidth = localStorage.getItem('saved-texts-left-panel-width');
        if (savedWidth) {
            leftPanel.style.flex = `0 0 ${savedWidth}%`;
        } else {
            // Default to 40% for text list
            leftPanel.style.flex = '0 0 40%';
        }
        
        // Handle double-click to reset to 40/60
        splitter.addEventListener('dblclick', () => {
            leftPanel.style.flex = '0 0 40%';
            localStorage.setItem('saved-texts-left-panel-width', '40');
            this.showToast('Layout nulstillet til 40/60', 'success');
        });
    }

    setupUndoRedoButtons() {
        // Handle all undo buttons
        const undoButtons = document.querySelectorAll('#undo-btn, #undo-btn-2');
        undoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.undo();
            });
        });
        
        // Handle all redo buttons
        const redoButtons = document.querySelectorAll('#redo-btn, #redo-btn-2');
        redoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.redo();
            });
        });
    }

    setupEditingToolbar() {
        // Handle toolbar buttons
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                
                // Save state before any formatting
                this.saveUndoState();
                
                // Set formatting flag to prevent auto-save interference
                this.isFormatting = true;
                
                // Ensure the preview content has focus
                const previewContent = document.getElementById('preview-content');
                if (previewContent) {
                    previewContent.focus();
                }
                
                // Use direct formatting for basic commands, execCommand for others
                if (['bold', 'italic', 'underline'].includes(command)) {
                    // Use our custom formatting for basic commands
                    this.applyFormatting(command);
                } else if (command === 'createLink') {
                    this.createLink();
                } else {
                    // Use execCommand for other commands (lists, alignment, etc.)
                    try {
                        document.execCommand(command, false, null);
                    } catch (e) {
                        console.error('Command failed:', e);
                    }
                }
                
                this.updateToolbarState();
                
                // Clear formatting flag quickly
                setTimeout(() => {
                    this.isFormatting = false;
                }, 100);
            });
        });
        
        // Handle heading selector
        const headingSelect = document.getElementById('heading-select');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                
                // Ensure the preview content has focus
                const previewContent = document.getElementById('preview-content');
                if (previewContent) {
                    previewContent.focus();
                }
                
                if (value) {
                    document.execCommand('formatBlock', false, value);
                } else {
                    document.execCommand('formatBlock', false, 'div');
                }
                this.updateToolbarState();
            });
        }
        
        // Handle font size selector
        const fontSizeSelect = document.getElementById('font-size-select');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                const size = e.target.value;
                
                // Ensure the preview content has focus
                const previewContent = document.getElementById('preview-content');
                if (previewContent) {
                    previewContent.focus();
                }
                
                // Use CSS styling for font size
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    if (!range.collapsed) {
                        const span = document.createElement('span');
                        span.style.fontSize = size + 'pt';
                        try {
                            range.surroundContents(span);
                        } catch (e) {
                            // If surroundContents fails, use execCommand as fallback
                            document.execCommand('fontSize', false, '3');
                            // Then apply custom styling
                            const fontElements = document.querySelectorAll('font[size="3"]');
                            fontElements.forEach(el => {
                                el.style.fontSize = size + 'pt';
                                el.removeAttribute('size');
                            });
                        }
                    }
                }
                this.updateToolbarState();
            });
        }
        
        // Handle AI editing buttons
        document.querySelectorAll('.ai-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const command = btn.dataset.command;
                if (command) {
                    await this.requestAIRevision(command);
                }
            });
        });
        
        // Handle custom AI command
        const customAIBtn = document.getElementById('custom-ai-btn');
        const customAIInput = document.getElementById('custom-ai-input');
        
        if (customAIBtn && customAIInput) {
            const executeCustomAI = async () => {
                const instruction = customAIInput.value.trim();
                if (instruction) {
                    await this.requestAIRevision(instruction);
                    customAIInput.value = '';
                }
            };
            
            customAIBtn.addEventListener('click', executeCustomAI);
            customAIInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    executeCustomAI();
                }
            });
        }
        
        // Update toolbar state when selection changes
        document.addEventListener('selectionchange', () => {
            this.updateToolbarState();
        });
    }

    // Save current state for undo
    saveUndoState() {
        const previewTitle = document.getElementById('preview-title');
        const previewContent = document.getElementById('preview-content');
        
        if (previewTitle && previewContent) {
            const state = {
                title: previewTitle.innerHTML,
                content: previewContent.innerHTML,
                timestamp: Date.now()
            };
            
            this.undoStack.push(state);
            
            // Limit undo stack size
            if (this.undoStack.length > this.maxUndoSteps) {
                this.undoStack.shift();
            }
            
            // Clear redo stack when new action is performed
            this.redoStack = [];
        }
    }

    // Undo last action
    undo() {
        if (this.undoStack.length === 0) return;
        
        const previewTitle = document.getElementById('preview-title');
        const previewContent = document.getElementById('preview-content');
        
        if (previewTitle && previewContent) {
            // Save current state to redo stack
            const currentState = {
                title: previewTitle.innerHTML,
                content: previewContent.innerHTML,
                timestamp: Date.now()
            };
            this.redoStack.push(currentState);
            
            // Restore previous state
            const previousState = this.undoStack.pop();
            previewTitle.innerHTML = previousState.title;
            previewContent.innerHTML = previousState.content;
            
            this.showToast('Fortryd udført', 'success');
        }
    }

    // Redo last undone action
    redo() {
        if (this.redoStack.length === 0) return;
        
        const previewTitle = document.getElementById('preview-title');
        const previewContent = document.getElementById('preview-content');
        
        if (previewTitle && previewContent) {
            // Save current state to undo stack
            const currentState = {
                title: previewTitle.innerHTML,
                content: previewContent.innerHTML,
                timestamp: Date.now()
            };
            this.undoStack.push(currentState);
            
            // Restore next state
            const nextState = this.redoStack.pop();
            previewTitle.innerHTML = nextState.title;
            previewContent.innerHTML = nextState.content;
            
            this.showToast('Gentag udført', 'success');
        }
    }

    applyFormatting(command) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (!selectedText) return;

        // Check if the selected text is already formatted
        const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
            ? range.commonAncestorContainer.parentElement 
            : range.commonAncestorContainer;

        let tagName;
        switch (command) {
            case 'bold':
                tagName = 'STRONG';
                break;
            case 'italic':
                tagName = 'EM';
                break;
            case 'underline':
                tagName = 'U';
                break;
            default:
                return;
        }

        // Check if we need to remove formatting (toggle)
        let elementToRemove = null;
        let currentElement = parentElement;
        while (currentElement && currentElement.tagName !== 'DIV') {
            if (currentElement.tagName === tagName) {
                elementToRemove = currentElement;
                break;
            }
            currentElement = currentElement.parentElement;
        }

        try {
            if (elementToRemove) {
                // Remove formatting
                const textContent = elementToRemove.textContent;
                const textNode = document.createTextNode(textContent);
                elementToRemove.parentNode.replaceChild(textNode, elementToRemove);
            } else {
                // Add formatting
                const element = document.createElement(tagName.toLowerCase());
                range.deleteContents();
                element.textContent = selectedText;
                range.insertNode(element);
                
                // Clear selection and place cursor after the new element
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.setStartAfter(element);
                newRange.collapse(true);
                selection.addRange(newRange);
            }
        } catch (e) {
            console.error('Formatting error:', e);
        }
    }

    createLink() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            this.showToast('Marker venligst tekst først før du tilføjer et link', 'warning');
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = range.toString().trim();
        
        if (!selectedText) {
            this.showToast('Marker venligst tekst først før du tilføjer et link', 'warning');
            return;
        }

        // Prompt for URL
        const url = prompt('Indtast URL (f.eks. https://www.example.com):');
        if (!url) {
            return; // User cancelled
        }

        // Validate URL (basic validation)
        let validUrl = url.trim();
        if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
            validUrl = 'https://' + validUrl;
        }

        try {
            // Save current state for undo
            this.saveUndoState();
            
            // Create link element
            const link = document.createElement('a');
            link.href = validUrl;
            link.textContent = selectedText;
            link.target = '_blank'; // Open in new tab
            link.rel = 'noopener noreferrer'; // Security best practice
            
            // Replace selected text with link
            range.deleteContents();
            range.insertNode(link);
            
            // Clear selection and place cursor after the link
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.setStartAfter(link);
            newRange.collapse(true);
            selection.addRange(newRange);
            
            this.showToast('Link tilføjet', 'success');
        } catch (e) {
            console.error('Link creation failed:', e);
            this.showToast('Fejl ved oprettelse af link', 'error');
        }
    }

    async requestAIRevision(instruction) {
        const previewContent = document.getElementById('preview-content');
        if (!previewContent || !previewContent.textContent.trim()) {
            this.showToast('Ingen tekst at redigere. Generer først noget indhold.', 'warning');
            return;
        }
        
        // Get current selection
        const selection = window.getSelection();
        let selectedText = '';
        let range = null;
        
        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            
            // Check if selection is within the preview content
            if (previewContent.contains(range.commonAncestorContainer) || 
                previewContent === range.commonAncestorContainer) {
                selectedText = range.toString().trim();
            }
        }
        
        // If no text is selected, show warning
        if (!selectedText) {
            this.showToast('Marker venligst den tekst du vil redigere med AI', 'warning');
            return;
        }
        
        this.showLoading();
        
        try {
            // Send only the selected text to AI for editing
            const response = await fetch('/api/revision-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original_text: selectedText,
                    instruction: instruction
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Save current state for undo
                this.saveUndoState();
                
                // Replace only the selected text with the revised text
                if (range) {
                    // Delete the selected content
                    range.deleteContents();
                    
                    // Convert the revised text to HTML and create a document fragment
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = this.convertTextToHTML(data.revised_text);
                    
                    // Create a document fragment with the new content
                    const fragment = document.createDocumentFragment();
                    while (tempDiv.firstChild) {
                        fragment.appendChild(tempDiv.firstChild);
                    }
                    
                    // Insert the new content at the cursor position
                    range.insertNode(fragment);
                    
                    // Clear the selection
                    selection.removeAllRanges();
                }
                
                this.showToast(`AI redigering færdig: ${instruction}`, 'success');
            } else {
                this.showToast(data.error || 'Fejl ved AI redigering', 'error');
            }
        } catch (error) {
            console.error('AI revision error:', error);
            this.showToast('Fejl ved AI redigering', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateToolbarState() {
        // Update button states based on current selection
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
            ? range.commonAncestorContainer.parentElement 
            : range.commonAncestorContainer;
        
        // Update format buttons
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            const command = btn.dataset.command;
            let isActive = false;
            
            try {
                switch (command) {
                    case 'bold':
                        isActive = document.queryCommandState('bold');
                        break;
                    case 'italic':
                        isActive = document.queryCommandState('italic');
                        break;
                    case 'underline':
                        isActive = document.queryCommandState('underline');
                        break;
                    case 'justifyLeft':
                        isActive = document.queryCommandState('justifyLeft');
                        break;
                    case 'justifyCenter':
                        isActive = document.queryCommandState('justifyCenter');
                        break;
                    case 'justifyRight':
                        isActive = document.queryCommandState('justifyRight');
                        break;
                    case 'justifyFull':
                        isActive = document.queryCommandState('justifyFull');
                        break;
                    case 'insertUnorderedList':
                        isActive = document.queryCommandState('insertUnorderedList');
                        break;
                    case 'insertOrderedList':
                        isActive = document.queryCommandState('insertOrderedList');
                        break;
                }
            } catch (e) {
                // Some commands might not be supported
                isActive = false;
            }
            
            btn.classList.toggle('active', isActive);
        });
        
        // Update heading selector
        const headingSelect = document.getElementById('heading-select');
        if (headingSelect && parentElement) {
            const tagName = parentElement.tagName ? parentElement.tagName.toLowerCase() : '';
            headingSelect.value = ['h1', 'h2', 'h3', 'h4'].includes(tagName) ? tagName : '';
        }
        
        // Update font size selector
        const fontSizeSelect = document.getElementById('font-size-select');
        if (fontSizeSelect && parentElement) {
            // Try to get font size from computed style or inline style
            let fontSize = '';
            const computedStyle = window.getComputedStyle(parentElement);
            const inlineSize = parentElement.style.fontSize;
            
            if (inlineSize) {
                fontSize = inlineSize.replace('pt', '');
            } else if (computedStyle.fontSize) {
                // Convert px to pt (approximate)
                const pxSize = parseFloat(computedStyle.fontSize);
                fontSize = Math.round(pxSize * 0.75).toString();
            }
            
            // Set the selector to the detected size if it exists in options
            const options = Array.from(fontSizeSelect.options).map(opt => opt.value);
            if (options.includes(fontSize)) {
                fontSizeSelect.value = fontSize;
            }
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadProfiles(),
                this.loadProducts(),
                this.loadSavedTexts()
            ]);
        } catch (error) {
            this.showToast('Fejl ved indlæsning af data: ' + error.message, 'error');
        }
    }

    async loadProfiles() {
        try {
            console.log('Loading profiles...');
            const response = await fetch('/api/profiles');
            const data = await response.json();
            console.log('Profiles data received:', data);
            
            this.profiles = data.profiles || {};
            this.currentProfile = data.current_profile;
            
            console.log('Current profile:', this.currentProfile);
            console.log('Available profiles:', Object.keys(this.profiles));
            
            // Update current profile display
            if (this.currentProfile) {
                document.getElementById('current-profile').textContent = this.currentProfile;
            } else {
                document.getElementById('current-profile').textContent = 'Ingen profil valgt';
            }
            
            this.updateProfilesList();
            
            // Select first profile if available and none is currently selected
            const profileNames = Object.keys(this.profiles);
            if (profileNames.length > 0 && !this.currentProfile) {
                console.log('Auto-selecting first profile:', profileNames[0]);
                await this.selectProfile(profileNames[0]);
            } else if (this.currentProfile && this.profiles[this.currentProfile]) {
                // Load current profile data into form
                const profile = this.profiles[this.currentProfile];
                document.getElementById('profile-name').value = profile.name || '';
                document.getElementById('profile-description').value = profile.description || '';
                document.getElementById('profile-values').value = profile.values || '';
                document.getElementById('profile-tone').value = profile.tone || '';
                
                // Load blocked words
                const blockedWords = profile.blocked_words || [];
                document.getElementById('blocked-words').value = blockedWords.join('\n');
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
            this.showToast('Fejl ved indlæsning af profiler', 'error');
        }
    }

    async loadProducts() {
        try {
            console.log('loadProducts called, currentProfile:', this.currentProfile);
            
            // If no profile is selected, clear products
            if (!this.currentProfile) {
                console.log('No profile selected, clearing products');
                this.products = [];
                this.updateProductsList();
                this.updateProductSelection();
                return;
            }

            const url = `/api/profiles/${encodeURIComponent(this.currentProfile)}/products`;
            console.log('Fetching products from:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('Products response:', data);
            
            this.products = data.products || [];
            console.log('Loaded products:', this.products);
            
            this.updateProductsList();
            this.updateProductSelection();
        } catch (error) {
            console.error('Error loading products:', error);
            this.products = [];
            this.updateProductsList();
        }
    }

    async loadSavedTexts() {
        try {
            const response = await fetch('/api/saved-texts');
            const data = await response.json();
            this.savedTexts = data.saved_texts || {};
            this.updateSavedTextsList();
        } catch (error) {
            console.error('Error loading saved texts:', error);
        }
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // If showing preview tab, initialize preview sub-tabs
        if (tabName === 'preview') {
            this.initializePreviewTabs();
            // Initialize saved texts splitter after tab is active
            setTimeout(() => {
                this.initializeSavedTextsResizableSplitter();
            }, 100);
        }
        
        // If showing profiles tab, initialize profile sub-tabs
        if (tabName === 'profiles') {
            this.initializeProfileTabs();
        }
    }

    initializePreviewTabs() {
        // Setup preview sub-tab event listeners if not already done
        if (!this.previewTabsInitialized) {
            document.querySelectorAll('.preview-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const previewTab = btn.dataset.previewTab;
                    this.showPreviewTab(previewTab);
                });
            });
            this.previewTabsInitialized = true;
        }
        
        // Show default tab (website preview)
        this.showPreviewTab('website');
    }

    showPreviewTab(tabName) {
        // Hide all preview tabs
        document.querySelectorAll('.preview-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all preview tab buttons
        document.querySelectorAll('.preview-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected preview tab
        const targetTab = document.getElementById(`${tabName}-preview-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        const targetBtn = document.querySelector(`[data-preview-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        // Handle specific tab initialization
        if (tabName === 'saved-texts') {
            this.loadSavedTexts();
        } else if (tabName === 'html') {
            this.updateHTMLDisplay();
        } else if (tabName === 'website') {
            // Re-initialize website preview to ensure contenteditable works
            this.initializeWebsitePreview();
            
            // Debug: Check if contenteditable is working
            setTimeout(() => {
                const previewTitle = document.getElementById('preview-title');
                const previewContent = document.getElementById('preview-content');
                console.log('Preview title contenteditable:', previewTitle?.getAttribute('contenteditable'));
                console.log('Preview content contenteditable:', previewContent?.getAttribute('contenteditable'));
                console.log('Preview title element:', previewTitle);
                console.log('Preview content element:', previewContent);
            }, 100);
        }
    }

    updateHTMLDisplay() {
        const htmlDisplay = document.getElementById('html-code-display');
        
        if (!htmlDisplay) return;
        
        let htmlContent = '';
        
        // Try to get content from different sources
        const previewContent = document.getElementById('preview-content');
        const outputContent = document.getElementById('output-content');
        const titleContent = document.getElementById('title-content');
        const metaContent = document.getElementById('meta-content');
        
        // Build complete HTML from all available content
        if (titleContent && titleContent.textContent.trim()) {
            htmlContent += `<h1>${titleContent.textContent}</h1>\n`;
        }
        
        if (metaContent && metaContent.textContent.trim()) {
            htmlContent += `<!-- Meta Description: ${metaContent.textContent} -->\n`;
        }
        
        // Use preview content if available (from website preview tab)
        if (previewContent && previewContent.innerHTML.trim() && !previewContent.innerHTML.includes('Klik for at redigere')) {
            htmlContent += previewContent.innerHTML;
        }
        // Otherwise use output content (from generator tab)
        else if (outputContent && outputContent.innerHTML.trim() && !outputContent.innerHTML.includes('Genereret indhold vises her')) {
            htmlContent += outputContent.innerHTML;
        }
        // Use stored content if available
        else if (this.lastGeneratedContent && this.lastGeneratedContent.html_content) {
            htmlContent += this.lastGeneratedContent.html_content;
        }
        else if (this.lastGeneratedContent && this.lastGeneratedContent.content) {
            htmlContent += this.convertTextToHTML(this.lastGeneratedContent.content);
        }
        
        if (htmlContent.trim()) {
            htmlDisplay.value = this.formatHTML(htmlContent);
        } else {
            htmlDisplay.value = '<!-- Ingen HTML indhold tilgængeligt. Generer først noget indhold. -->';
        }
    }

    formatHTML(html) {
        if (!html || html.trim() === '') return '';
        
        // Simple HTML formatting with proper indentation
        let formatted = html
            .replace(/></g, '>\n<')
            .replace(/^\s+|\s+$/g, '');
        
        const lines = formatted.split('\n');
        let indentLevel = 0;
        const indentSize = 2;
        
        return lines
            .map(line => {
                const trimmed = line.trim();
                if (!trimmed) return '';
                
                // Decrease indent for closing tags
                if (trimmed.startsWith('</')) {
                    indentLevel = Math.max(0, indentLevel - 1);
                }
                
                const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;
                
                // Increase indent for opening tags (but not self-closing)
                if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('<!--')) {
                    indentLevel++;
                }
                
                return indentedLine;
            })
            .filter(line => line.trim().length > 0)
            .join('\n');
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    async generateSEO() {
        console.log('generateSEO function called');
        console.log('Current profile:', this.currentProfile);
        
        const keywords = document.getElementById('keywords').value.trim();
        console.log('Keywords:', keywords);
        
        if (!keywords) {
            this.showToast('Indtast venligst nøgleord', 'warning');
            return;
        }

        if (!this.currentProfile) {
            this.showToast('Vælg venligst en profil først', 'warning');
            return;
        }

        const formData = {
            keywords: keywords,
            secondary_keywords: document.getElementById('secondary-keywords').value.trim(),
            lsi_keywords: document.getElementById('lsi-keywords').value.trim(),
            target_audience: document.getElementById('target-audience').value,
            content_purpose: document.getElementById('content-purpose').value,
            content_type: document.getElementById('content-type').value,
            custom_instructions: document.getElementById('custom-instructions').value.trim(),
            text_length: parseInt(document.getElementById('text-length').value),
            include_meta: document.getElementById('include-meta').checked,
            include_keywords: document.getElementById('include-keywords').checked,
            include_faq: document.getElementById('include-faq').checked,
            include_cta: document.getElementById('include-cta').checked,
            include_schema: document.getElementById('include-schema').checked,
            include_internal_links: document.getElementById('include-internal-links').checked,
            selected_products: this.getSelectedProducts(),
            profile: this.currentProfile
        };

        console.log('Form data:', formData);
        this.showLoading();

        try {
            console.log('Sending request to /api/enhanced-generate-seo');
            const response = await fetch('/api/enhanced-generate-seo', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                await this.displayGeneratedContent(data);
                this.addToGeneratedTexts(data);
                this.showToast('SEO indhold genereret!', 'success');
            } else {
                console.error('Generation failed:', data);
                throw new Error(data.error || 'Generation failed');
            }
        } catch (error) {
            console.error('Generation error:', error);
            this.showToast('Fejl ved generering: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async generateSEOVariations() {
        const keywords = document.getElementById('keywords').value.trim();
        
        if (!keywords) {
            this.showToast('Indtast venligst nøgleord for at generere variationer', 'warning');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/generate-seo-variations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: keywords, count: 3 })
            });

            const data = await response.json();

            if (response.ok) {
                data.variations.forEach((variation, index) => {
                    const variationData = {
                        text: variation.text,
                        html: variation.html,
                        title: `Variation ${index + 1} - ${keywords}`
                    };
                    this.addToGeneratedTexts(variationData);
                });
                
                this.showToast(`${data.variations.length} variationer genereret!`, 'success');
            } else {
                throw new Error(data.error || 'Variation generation failed');
            }
        } catch (error) {
            this.showToast('Fejl ved generering af variationer: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async requestRevision() {
        const instruction = document.getElementById('revision-instruction').value.trim();
        const previewContent = document.getElementById('preview-content');
        const outputContent = document.getElementById('output-content');
        
        if (!instruction) {
            this.showToast('Indtast venligst en revision instruktion', 'warning');
            return;
        }

        // Get text from preview content (new location) or fallback to output content
        let textToRevise = '';
        if (previewContent && previewContent.textContent && !previewContent.textContent.includes('Genereret indhold vises her')) {
            textToRevise = previewContent.textContent;
        } else if (outputContent && outputContent.textContent && !outputContent.textContent.includes('Genereret indhold vises her')) {
            textToRevise = outputContent.textContent;
        }

        if (!textToRevise) {
            this.showToast('Ingen tekst at revidere. Generer først noget indhold.', 'warning');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/revision-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    original_text: textToRevise,
                    instruction: instruction
                })
            });

            const data = await response.json();

            if (response.ok) {
                await this.displayGeneratedContent({
                    text: data.revised_text,
                    html: data.revised_html
                });
                document.getElementById('revision-instruction').value = '';
                this.showToast('Tekst revideret!', 'success');
            } else {
                throw new Error(data.error || 'Revision failed');
            }
        } catch (error) {
            this.showToast('Fejl ved revision: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async displayGeneratedContent(data) {
        // Update title display
        const titleDisplay = document.getElementById('title-display');
        const titleContent = document.getElementById('title-content');
        if (data.title && titleDisplay && titleContent) {
            titleContent.textContent = data.title;
            titleDisplay.style.display = 'block';
        } else if (titleDisplay) {
            titleDisplay.style.display = 'none';
        }

        // Update meta description display
        const metaDisplay = document.getElementById('meta-display');
        const metaContent = document.getElementById('meta-content');
        if (data.meta_description && metaDisplay && metaContent) {
            metaContent.textContent = data.meta_description;
            metaDisplay.style.display = 'block';
        } else if (metaDisplay) {
            metaDisplay.style.display = 'none';
        }

        // outputContent will be synced with previewContent below for consistency

        // Don't update website-preview directly as it contains the editable fields
        // The editable fields are updated separately below
        
        // Update editable preview fields
        const previewTitle = document.getElementById('preview-title');
        const previewContent = document.getElementById('preview-content');
        const metaTitle = document.getElementById('meta-title');
        const metaDescription = document.getElementById('meta-description');
        
        if (previewTitle && data.title) {
            previewTitle.textContent = data.title;
            // Maintain current edit mode state
            if (this.isEditMode) {
                previewTitle.setAttribute('contenteditable', 'true');
                previewTitle.classList.add('edit-mode');
                previewTitle.classList.remove('preview-mode');
            } else {
                previewTitle.setAttribute('contenteditable', 'false');
                previewTitle.classList.add('preview-mode');
                previewTitle.classList.remove('edit-mode');
            }
        }
        
        if (previewContent) {
            let htmlContent = data.html_content || this.convertTextToHTML(data.content || data.text || '');
            // Remove H1 tags from content since title is shown separately
            htmlContent = htmlContent.replace(/<h1[^>]*>.*?<\/h1>/gi, '');
            previewContent.innerHTML = htmlContent;
            
            // Sync outputContent with previewContent to ensure consistency
            const outputContent = document.getElementById('output-content');
            if (outputContent) {
                outputContent.innerHTML = htmlContent;
            }
            
            // Maintain current edit mode state
            if (this.isEditMode) {
                previewContent.setAttribute('contenteditable', 'true');
                previewContent.classList.add('edit-mode');
                previewContent.classList.remove('preview-mode');
            } else {
                previewContent.setAttribute('contenteditable', 'false');
                previewContent.classList.add('preview-mode');
                previewContent.classList.remove('edit-mode');
            }
        }
        
        if (metaTitle && data.title) {
            metaTitle.value = data.title;
        }
        
        if (metaDescription && data.meta_description) {
            metaDescription.value = data.meta_description;
        }

        // Store the generated content for later use
        this.lastGeneratedContent = {
            title: data.title || '',
            meta_description: data.meta_description || '',
            content: data.content || data.text || '',
            html_content: data.html_content || '',
            keywords: data.keywords || '',
            profile: data.profile || ''
        };
        
        // Auto-save the generated content
        await this.autoSaveGeneratedContent(data);
        
        // Update HTML display if preview tab is active
        this.updateHTMLDisplay();
    }

    async autoSaveGeneratedContent(data) {
        try {
            // Generate a unique name based on title or timestamp
            const title = data.title || 'Genereret tekst';
            const timestamp = new Date().toLocaleString('da-DK');
            const textName = `${title} - ${timestamp}`;
            
            // Prepare content for saving
            const textContent = data.html_content || this.convertTextToHTML(data.content || data.text || '');
            
            const saveData = {
                name: textName,
                content: textContent,
                title: data.title || '',
                meta_description: data.meta_description || '',
                keywords: data.keywords || '',
                category: 'Auto-gemt'
            };
            
            const response = await fetch('/api/save-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saveData)
            });
            
            if (response.ok) {
                // Set current text name for future edits
                this.currentTextName = textName;
                
                // Reload saved texts to show the new text
                await this.loadSavedTexts();
                
                // Show success message
                this.showToast(`✓ Tekst gemt automatisk som "${textName}"`, 'success');
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
            // Don't show error to user for auto-save failures
        }
    }

    // Helper function to convert text to HTML with proper formatting
    convertTextToHTML(text) {
        return text
            // Convert markdown-style headings
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Convert bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert italic text
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Convert line breaks to paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '')
            .replace(/<p><br><\/p>/g, '<br>');
    }

    addToGeneratedTexts(data) {
        const title = data.title || `Genereret tekst ${this.generatedTexts.length + 1}`;
        
        // Store both original and website-formatted versions
        let htmlContent;
        if (data.html_content) {
            // Use the HTML version from backend (converted with markdown)
            htmlContent = data.html_content;
        } else if (data.html) {
            htmlContent = data.html;
        } else if (data.content) {
            // Convert using the same logic as display
            htmlContent = this.convertTextToHTML(data.content);
        } else if (data.text) {
            htmlContent = this.convertTextToHTML(data.text);
        }
        
        this.generatedTexts.push({
            title: title,
            text: data.content || data.text || '',
            html: htmlContent,
            websiteHtml: this.convertToWebsiteHTML(data.content || data.text || ''), // Separate website preview version
            meta_description: data.meta_description || '',
            keywords: data.keywords || '',
            profile: data.profile || '',
            timestamp: new Date().toISOString()
        });
        
        this.updatePreviewSelector();
    }

    updatePreviewSelector() {
        const selector = document.getElementById('preview-selector');
        selector.innerHTML = '<option value="">Vælg tekst at redigere...</option>';
        
        this.generatedTexts.forEach((text, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = text.title;
            selector.appendChild(option);
        });
    }

    loadTextIntoEditor(index) {
        if (index >= 0 && index < this.generatedTexts.length) {
            const textData = this.generatedTexts[index];
            const previewTitle = document.getElementById('preview-title');
            const previewContent = document.getElementById('preview-content');
            
            // Load title
            if (textData.title) {
                previewTitle.textContent = textData.title;
                document.getElementById('meta-title').value = textData.title;
            } else {
                previewTitle.textContent = '';
            }
            
            // Load meta description
            if (textData.meta_description) {
                document.getElementById('meta-description').value = textData.meta_description;
            }
            
            // Load content - use website HTML version for better preview
            let htmlContent = '';
            if (textData.websiteHtml) {
                htmlContent = textData.websiteHtml;
            } else if (textData.html) {
                htmlContent = textData.html;
            } else {
                previewContent.textContent = textData.text || '';
                htmlContent = '';
            }
            
            if (htmlContent) {
                // Remove H1 tags from content since title is shown separately
                htmlContent = htmlContent.replace(/<h1[^>]*>.*?<\/h1>/gi, '');
                previewContent.innerHTML = htmlContent;
            }
            
            // Maintain current edit mode state after content load
            if (this.isEditMode) {
                previewTitle.setAttribute('contenteditable', 'true');
                previewTitle.classList.add('edit-mode');
                previewTitle.classList.remove('preview-mode');
                previewContent.setAttribute('contenteditable', 'true');
                previewContent.classList.add('edit-mode');
                previewContent.classList.remove('preview-mode');
            } else {
                previewTitle.setAttribute('contenteditable', 'false');
                previewTitle.classList.add('preview-mode');
                previewTitle.classList.remove('edit-mode');
                previewContent.setAttribute('contenteditable', 'false');
                previewContent.classList.add('preview-mode');
                previewContent.classList.remove('edit-mode');
            }
            
            // Update HTML display
            this.updateHTMLDisplay();
        }
    }

    clearPreviewList() {
        this.generatedTexts = [];
        this.updatePreviewSelector();
        
        // Clear contenteditable fields
        document.getElementById('preview-title').textContent = '';
        document.getElementById('preview-content').textContent = '';
        document.getElementById('meta-title').value = '';
        document.getElementById('meta-description').value = '';
        
        this.showToast('Preview liste ryddet', 'success');
    }

    async saveEditedText() {
        const title = document.getElementById('meta-title').value.trim() || 
                     document.getElementById('preview-title').textContent.trim() || 
                     'Redigeret tekst';
        const metaDescription = document.getElementById('meta-description').value.trim();
        const content = document.getElementById('preview-content').innerHTML;

        if (!content || content.trim() === '') {
            this.showToast('Ingen indhold at gemme', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/save-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: title,
                    content: content,  // Body content only
                    title: title,  // Separate title
                    meta_description: metaDescription,  // Separate meta description
                    keywords: document.getElementById('keywords').value.trim(),
                    profile: this.currentProfile
                })
            });

            if (response.ok) {
                this.showToast('Tekst gemt!', 'success');
                this.loadSavedTexts();
            } else {
                throw new Error('Failed to save text');
            }
        } catch (error) {
            this.showToast('Fejl ved gemning af tekst', 'error');
        }
    }

    copyPreviewHTML() {
        const title = document.getElementById('preview-title').textContent.trim();
        const content = document.getElementById('preview-content').innerHTML;
        
        let fullHTML = '';
        if (title) {
            fullHTML += `<h1>${title}</h1>\n`;
        }
        fullHTML += content;
        
        this.copyToClipboard('html', fullHTML);
    }

    async copyToClipboard(type, customContent = null) {
        let content;
        
        if (customContent) {
            content = customContent;
        } else {
            // Try to get content from preview-content first, then fallback to output-content
            const previewContent = document.getElementById('preview-content');
            const outputContent = document.getElementById('output-content');
            
            let sourceElement = null;
            if (previewContent && previewContent.innerHTML && !previewContent.innerHTML.includes('Genereret indhold vises her')) {
                sourceElement = previewContent;
            } else if (outputContent && outputContent.innerHTML && !outputContent.innerHTML.includes('Genereret indhold vises her')) {
                sourceElement = outputContent;
            }
            
            if (sourceElement) {
                if (type === 'html') {
                    content = sourceElement.innerHTML;
                } else {
                    content = sourceElement.textContent;
                }
            } else {
                this.showToast('Ingen indhold at kopiere', 'warning');
                return;
            }
        }

        try {
            await navigator.clipboard.writeText(content);
            this.showToast(`${type.toUpperCase()} kopieret til udklipsholder!`, 'success');
        } catch (error) {
            this.showToast('Fejl ved kopiering', 'error');
        }
    }

    async saveGeneratedText() {
        // Try to get content from preview-content first, then fallback to output-content
        const previewContent = document.getElementById('preview-content');
        const outputContent = document.getElementById('output-content');
        
        let sourceElement = null;
        if (previewContent && previewContent.innerHTML && !previewContent.innerHTML.includes('Genereret indhold vises her')) {
            sourceElement = previewContent;
        } else if (outputContent && outputContent.innerHTML && !outputContent.innerHTML.includes('Genereret indhold vises her')) {
            sourceElement = outputContent;
        }
        
        if (!sourceElement) {
            this.showToast('Ingen indhold at gemme', 'warning');
            return;
        }

        const name = prompt('Indtast navn for teksten:');
        if (!name) return;

        // Get title and meta description from the form fields
        const title = document.getElementById('meta-title').value.trim();
        const metaDescription = document.getElementById('meta-description').value.trim();

        try {
            const response = await fetch('/api/save-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    content: sourceElement.innerHTML,  // Body content only
                    title: title,  // Separate title
                    meta_description: metaDescription,  // Separate meta description
                    keywords: document.getElementById('keywords').value.trim(),
                    profile: this.currentProfile
                })
            });

            if (response.ok) {
                this.showToast('Tekst gemt!', 'success');
                this.loadSavedTexts();
            } else {
                throw new Error('Failed to save text');
            }
        } catch (error) {
            this.showToast('Fejl ved gemning af tekst', 'error');
        }
    }

    getSelectedProducts() {
        const checkboxes = document.querySelectorAll('#product-selection input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    updateProductSelection() {
        const container = document.getElementById('product-selection');
        
        // Store currently selected products before clearing
        const currentlySelected = this.getSelectedProducts();
        
        container.innerHTML = '';

        if (!this.products || this.products.length === 0) {
            container.innerHTML = '<p class="text-muted">Ingen produkter tilgængelige</p>';
            return;
        }

        this.products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-item';
            
            // Check if this product was previously selected
            const isSelected = currentlySelected.includes(product.name);
            
            item.innerHTML = `
                <input type="checkbox" value="${product.name}" id="product-${product.name}" name="product" ${isSelected ? 'checked' : ''}>
                <label for="product-${product.name}">${product.name}</label>
            `;
            container.appendChild(item);
        });
    }

    updateProfilesList() {
        const container = document.getElementById('profiles-list');
        container.innerHTML = '';

        Object.keys(this.profiles).forEach(profileName => {
            const item = document.createElement('div');
            item.className = 'profile-item';
            
            const button = document.createElement('button');
            button.className = 'btn-secondary';
            button.textContent = profileName;
            button.addEventListener('click', () => this.selectProfile(profileName));
            
            // Highlight current profile
            if (this.currentProfile === profileName) {
                button.classList.add('active');
            }
            
            item.appendChild(button);
            container.appendChild(item);
        });
    }

    async selectProfile(profileName) {
        if (!profileName) {
            this.currentProfile = null;
            this.clearProfileForm();
            document.getElementById('current-profile').textContent = 'Ingen profil valgt';
            return;
        }

        try {
            const response = await fetch(`/api/profiles/${encodeURIComponent(profileName)}/select`, {
                method: 'POST'
            });

            if (response.ok) {
                this.currentProfile = profileName;
                document.getElementById('current-profile').textContent = profileName;
                
                // Load profile data into form
                if (this.profiles[profileName]) {
                    const profile = this.profiles[profileName];
                    document.getElementById('profile-name').value = profile.name || '';
                    document.getElementById('profile-description').value = profile.description || '';
                    document.getElementById('profile-values').value = profile.values || '';
                    document.getElementById('profile-tone').value = profile.tone || '';
                    document.getElementById('profile-api-key').value = profile.api_key || '';
                    document.getElementById('blocked-words').value = (profile.blocked_words || []).join('\n');
                    document.getElementById('profile-url').value = profile.url || '';
                    document.getElementById('profile-internal-links').value = profile.internal_links || '';
                    
                    // Load Shopify credentials
                    document.getElementById('profile-shopify-store-url').value = profile.shopify_store_url || '';
                    document.getElementById('profile-shopify-api-token').value = profile.shopify_api_token || '';
                    document.getElementById('profile-shopify-api-version').value = profile.shopify_api_version || '2023-10';
                }
                
                // Update products list for this profile
                await this.loadProducts();
                this.updateProductsList();
                
                // Update saved texts for this profile
                await this.loadSavedTexts();
                
                // Update current profile name in products tab
                this.updateCurrentProfileName();
                
                this.showToast(`Profil "${profileName}" valgt`, 'success');
            } else {
                this.showToast('Fejl ved valg af profil', 'error');
            }
        } catch (error) {
            console.error('Error selecting profile:', error);
            this.showToast('Fejl ved valg af profil', 'error');
        }
    }

    clearProfileForm() {
        document.getElementById('profile-name').value = '';
        document.getElementById('profile-description').value = '';
        document.getElementById('profile-values').value = '';
        document.getElementById('profile-tone').value = '';
        document.getElementById('profile-api-key').value = '';
        document.getElementById('blocked-words').value = '';
        document.getElementById('profile-url').value = '';
        document.getElementById('profile-internal-links').value = '';
        
        // Clear Shopify credentials
        document.getElementById('profile-shopify-store-url').value = '';
        document.getElementById('profile-shopify-api-token').value = '';
        document.getElementById('profile-shopify-api-version').value = '2023-10';
        
        // Update current profile name in products tab
        this.updateCurrentProfileName();
    }

    async addProfile() {
        const name = prompt('Indtast profilnavn:');
        if (!name || name.trim() === '') return;

        const profileData = {
            name: name.trim(),
            description: '',
            values: '',
            tone: '',
            api_key: '',
            blocked_words: [],
            url: '',
            internal_links: '',
            products: []
        };

        try {
            const response = await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showToast('Profil oprettet succesfuldt!');
                await this.loadProfiles();
                await this.selectProfile(name.trim());
            } else {
                this.showToast(result.error || 'Fejl ved oprettelse af profil', 'error');
            }
        } catch (error) {
            console.error('Error adding profile:', error);
            this.showToast('Fejl ved oprettelse af profil', 'error');
        }
    }

    async saveProfile() {
        const profileName = document.getElementById('profile-name').value.trim();
        if (!profileName) {
            this.showToast('Profilnavn er påkrævet', 'error');
            return;
        }

        const profileData = {
            name: profileName,
            description: document.getElementById('profile-description').value.trim(),
            values: document.getElementById('profile-values').value.trim(),
            tone: document.getElementById('profile-tone').value.trim(),
            api_key: document.getElementById('profile-api-key').value.trim(),
            blocked_words: document.getElementById('blocked-words').value.split('\n').filter(word => word.trim()),
            url: document.getElementById('profile-url').value.trim(),
            internal_links: document.getElementById('profile-internal-links').value.trim(),
            // Add Shopify credentials
            shopify_store_url: document.getElementById('profile-shopify-store-url').value.trim(),
            shopify_api_token: document.getElementById('profile-shopify-api-token').value.trim(),
            shopify_api_version: document.getElementById('profile-shopify-api-version').value.trim()
        };

        try {
            this.showLoading();
            
            let response;
            if (this.currentProfile && this.currentProfile === profileName) {
                // Update existing profile
                response = await fetch(`/api/profiles/${encodeURIComponent(profileName)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(profileData)
                });
            } else {
                // Create new profile
                response = await fetch('/api/profiles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(profileData)
                });
            }

            const result = await response.json();
            
            if (response.ok) {
                this.showToast('Profil gemt succesfuldt', 'success');
                await this.loadProfiles();
                this.selectProfile(profileName);
            } else {
                this.showToast(result.error || 'Fejl ved gemning af profil', 'error');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showToast('Fejl ved gemning af profil', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteProfile() {
        if (!this.currentProfile) {
            this.showToast('Ingen profil valgt', 'warning');
            return;
        }

        if (!confirm(`Er du sikker på at du vil slette profilen "${this.currentProfile}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/profiles/${this.currentProfile}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showToast('Profil slettet!', 'success');
                this.currentProfile = null;
                document.getElementById('current-profile').textContent = 'Ingen profil valgt';
                this.loadProfiles();
            } else {
                throw new Error('Failed to delete profile');
            }
        } catch (error) {
            this.showToast('Fejl ved sletning af profil', 'error');
        }
    }

    updateProductsList() {
        console.log('updateProductsList called');
        console.log('currentProfile:', this.currentProfile);
        console.log('products:', this.products);
        
        const container = document.getElementById('products-list');
        if (!container) {
            console.error('products-list container not found!');
            return;
        }
        
        container.innerHTML = '';

        if (!this.currentProfile) {
            console.log('No profile selected, showing empty state');
            container.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">Vælg en profil i venstre side for at se og administrere produkter.</p>
                </div>
            `;
            return;
        }

        if (!this.products || this.products.length === 0) {
            console.log('No products found, showing empty state');
            container.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">Ingen produkter tilføjet endnu.</p>
                    <p class="text-muted">Klik på "➕ Tilføj Produkt" for at komme i gang.</p>
                </div>
            `;
            return;
        }

        console.log('Displaying', this.products.length, 'products');
        this.products.forEach((product, index) => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.innerHTML = `
                <h4>${product.name}</h4>
                <p><strong>URL:</strong> ${product.url || 'Ingen URL'}</p>
                <p><strong>Beskrivelse:</strong> ${product.description || 'Ingen beskrivelse'}</p>
                <div class="product-actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.editProduct(${index})">✏️ Rediger</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteProduct(${index})">🗑️ Slet</button>
                </div>
            `;
            container.appendChild(item);
        });
    }

    updateSavedTextsList() {
        const container = document.getElementById('texts-list-container');
        if (!container) return;
        
        container.innerHTML = '';

        if (!this.savedTexts || Object.keys(this.savedTexts).length === 0) {
            container.innerHTML = '<p class="text-muted">Ingen gemte tekster</p>';
            return;
        }

        // Convert dictionary to array for easier handling
        const textsArray = Object.entries(this.savedTexts).map(([name, data]) => ({
            name: name,
            ...data,
            timestamp: data.created_at || new Date().toISOString()
        }));

        // Sort by creation date (newest first)
        textsArray.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        textsArray.forEach((text, index) => {
            const item = document.createElement('div');
            item.className = 'saved-text-item';
            item.dataset.textName = text.name;
            item.innerHTML = `
                <h4>${text.name}</h4>
                <div class="text-meta">
                    <span class="text-date">${new Date(text.timestamp).toLocaleDateString('da-DK')}</span>
                    ${text.profile ? `<span class="text-muted"> • ${text.profile}</span>` : ''}
                    ${text.keywords ? `<span class="text-muted"> • ${text.keywords}</span>` : ''}
                </div>
                <div class="text-preview">${text.content.substring(0, 120)}...</div>
                <div class="text-actions" onclick="event.stopPropagation();">
                    <button class="btn btn-sm btn-primary" onclick="app.editSavedText('${text.name}')">✏️ Rediger</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteSavedText('${text.name}')">🗑️ Slet</button>
                </div>
            `;
            
            // Add click handler to show preview
            item.addEventListener('click', () => this.showTextPreview(text.name));
            
            container.appendChild(item);
        });

        // Initialize filtering after creating elements
        this.initializeTextFiltering();
    }

    initializeTextFiltering() {
        // Setup event listeners for filtering controls
        const searchInput = document.getElementById('text-search');
        const dateFromInput = document.getElementById('date-from');
        const dateToInput = document.getElementById('date-to');
        const sortSelect = document.getElementById('sort-order');
        const clearButton = document.getElementById('clear-filters');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterSavedTexts());
        }
        if (dateFromInput) {
            dateFromInput.addEventListener('change', () => this.filterSavedTexts());
        }
        if (dateToInput) {
            dateToInput.addEventListener('change', () => this.filterSavedTexts());
        }
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.filterSavedTexts());
        }
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clearFilters());
        }

        // Setup preview action buttons
        const editSelectedBtn = document.getElementById('edit-selected-text-btn');
        const copySelectedBtn = document.getElementById('copy-selected-text-btn');
        const deleteSelectedBtn = document.getElementById('delete-selected-text-btn');

        if (editSelectedBtn) {
            editSelectedBtn.addEventListener('click', () => this.editSelectedText());
        }
        if (copySelectedBtn) {
            copySelectedBtn.addEventListener('click', () => this.copySelectedText());
        }
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedText());
        }

        // Update statistics
        this.updateTextStatistics();
    }

    updateTextStatistics() {
        const totalTexts = Object.keys(this.savedTexts || {}).length;
        const totalCountElement = document.getElementById('total-texts-count');
        if (totalCountElement) {
            totalCountElement.textContent = `${totalTexts} tekster`;
        }
    }

    showTextPreview(textName) {
        if (!this.savedTexts || !this.savedTexts[textName]) return;
        
        const text = this.savedTexts[textName];
        
        // Remove selection from all items
        document.querySelectorAll('.saved-text-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        const selectedItem = document.querySelector(`[data-text-name="${textName}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Update preview content
        const previewContent = document.getElementById('text-preview-content');
        previewContent.innerHTML = `
            <div class="preview-text-content">
                <h2>${text.title || textName}</h2>
                ${text.meta_description ? `<div class="meta-description"><strong>Meta beskrivelse:</strong> ${text.meta_description}</div>` : ''}
                <div class="creation-info">
                    <small class="text-muted">
                        Oprettet: ${new Date(text.created_at || text.timestamp).toLocaleDateString('da-DK')}
                        ${text.profile ? ` • Profil: ${text.profile}` : ''}
                        ${text.keywords ? ` • Nøgleord: ${text.keywords}` : ''}
                    </small>
                </div>
                <hr>
                <div class="text-content">${text.content}</div>
            </div>
        `;
        
        // Store current selected text for buttons
        this.selectedTextName = textName;
        
        // Show action buttons
        const textActions = document.querySelector('#preview .text-actions');
        if (textActions) {
            textActions.style.display = 'flex';
        }
    }

    // Update button handlers to work with preview
    editSelectedText() {
        if (!this.selectedTextName) {
            this.showToast('Vælg først en tekst at redigere', 'warning');
            return;
        }
        this.editSavedText(this.selectedTextName);
    }

    copySelectedText() {
        if (!this.selectedTextName || !this.savedTexts[this.selectedTextName]) {
            this.showToast('Vælg først en tekst at kopiere', 'warning');
            return;
        }
        
        const text = this.savedTexts[this.selectedTextName];
        const textToCopy = `${text.title || this.selectedTextName}\n\n${text.content}`;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            this.showToast('Tekst kopieret til udklipsholder', 'success');
        }).catch(() => {
            this.showToast('Kunne ikke kopiere tekst', 'error');
        });
    }

    deleteSelectedText() {
        if (!this.selectedTextName) {
            this.showToast('Vælg først en tekst at slette', 'warning');
            return;
        }
        this.deleteSavedText(this.selectedTextName);
    }

    previewSavedText(textName) {
        if (!this.savedTexts || !this.savedTexts[textName]) return;
        
        const text = this.savedTexts[textName];
        
        // Set current text name for auto-save
        this.currentTextName = textName;
        
        // Load text into the preview editor for direct editing
        document.getElementById('meta-title').value = text.title || '';
        document.getElementById('meta-description').value = text.meta_description || '';
        document.getElementById('preview-title').textContent = text.title || 'Redigeret tekst';
        document.getElementById('preview-content').innerHTML = text.content;
        
        // Update stored content for HTML display
        this.lastGeneratedContent = {
            title: text.title || '',
            meta_description: text.meta_description || '',
            content: text.content || '',
            html_content: text.content || '',
            keywords: text.keywords || '',
            profile: text.profile || ''
        };
        
        // Switch to preview tab and website sub-tab
        this.showTab('preview');
        this.showPreviewTab('website');
        
        // Activate edit mode automatically
        if (!this.isEditMode) {
            this.toggleEditMode();
        }
        
        this.showToast(`Indlæste "${textName}" til redigering`, 'success');
        
        // Update HTML display
        this.updateHTMLDisplay();
    }

    editSavedText(textName) {
        if (!this.savedTexts || !this.savedTexts[textName]) return;
        
        const text = this.savedTexts[textName];
        
        // Set current text name for auto-save
        this.currentTextName = textName;
        
        // Load text into the preview editor
        document.getElementById('meta-title').value = text.title || '';
        document.getElementById('meta-description').value = text.meta_description || '';
        document.getElementById('preview-title').textContent = text.title || 'Redigeret tekst';
        document.getElementById('preview-content').innerHTML = text.content;
        
        // Update stored content for HTML display
        this.lastGeneratedContent = {
            title: text.title || '',
            meta_description: text.meta_description || '',
            content: text.content || '',
            html_content: text.content || '',
            keywords: text.keywords || '',
            profile: text.profile || ''
        };
        
        // Switch to generator tab (where the preview is now located)
        this.showTab('generator');
        
        // Ensure edit mode is active
        this.isEditMode = true;
        
        // Save initial state for undo functionality
        this.saveUndoState();
        
        this.showToast(`Indlæste "${textName}" til redigering`, 'success');
    }

    async deleteSavedText(textName) {
        if (!confirm(`Er du sikker på at du vil slette "${textName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/saved-texts/${encodeURIComponent(textName)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                delete this.savedTexts[textName];
                this.updateSavedTextsList();
                this.showToast('Tekst slettet', 'success');
                
                // Clear preview if this text was being previewed
                if (this.selectedTextName === textName) {
                    const previewContent = document.getElementById('text-preview-content');
                    if (previewContent) {
                        previewContent.innerHTML = `
                            <div class="placeholder-message">
                                <h3>👈 Vælg en tekst</h3>
                                <p>Klik på en tekst i listen til venstre for at se indholdet her.</p>
                                <ul>
                                    <li>Se fuld tekst med formatering</li>
                                    <li>Rediger direkte fra forhåndsvisning</li>
                                    <li>Kopier indhold til udklipsholder</li>
                                </ul>
                            </div>
                        `;
                    }
                    
                    // Hide action buttons
                    const textActions = document.querySelector('#preview .text-actions');
                    if (textActions) {
                        textActions.style.display = 'none';
                    }
                    
                    this.selectedTextName = null;
                }
            } else {
                throw new Error('Failed to delete text');
            }
        } catch (error) {
            this.showToast('Fejl ved sletning af tekst', 'error');
        }
    }

    loadToPreview(textName) {
        if (!this.savedTexts || !this.savedTexts[textName]) return;
        
        const text = this.savedTexts[textName];
        
        // Set current text name for auto-save
        this.currentTextName = textName;
        
        // Load text into the website preview editor
        document.getElementById('meta-title').value = text.title || '';
        document.getElementById('meta-description').value = text.meta_description || '';
        document.getElementById('preview-title').textContent = text.title || 'Indlæst tekst';
        document.getElementById('preview-content').innerHTML = text.content;
        
        // Update stored content for HTML display
        this.lastGeneratedContent = {
            title: text.title || '',
            meta_description: text.meta_description || '',
            content: text.content || '',
            html_content: text.content || '',
            keywords: text.keywords || '',
            profile: text.profile || ''
        };
        
        // Switch to website preview tab
        this.showPreviewTab('website');
        this.showToast(`Indlæste "${textName}" til website preview`, 'success');
        
        // Update HTML display
        this.updateHTMLDisplay();
    }

    loadSelectedTextToPreview() {
        // Use the stored selected text name
        if (this.selectedTextName) {
            this.loadToPreview(this.selectedTextName);
        } else {
            this.showToast('Vælg først en tekst at indlæse', 'warning');
        }
    }

    copyHTMLCode() {
        const htmlDisplay = document.getElementById('html-code-display');
        if (htmlDisplay && htmlDisplay.value) {
            navigator.clipboard.writeText(htmlDisplay.value).then(() => {
                this.showToast('HTML kode kopieret!', 'success');
            }).catch(() => {
                this.showToast('Fejl ved kopiering', 'error');
            });
        } else {
            this.showToast('Ingen HTML kode at kopiere', 'warning');
        }
    }

    formatHTMLCode() {
        const htmlDisplay = document.getElementById('html-code-display');
        if (htmlDisplay && htmlDisplay.value) {
            const formatted = this.formatHTML(htmlDisplay.value);
            htmlDisplay.value = formatted;
            this.showToast('HTML kode formateret!', 'success');
        }
    }

    initializeProfileTabs() {
        // Setup profile sub-tab event listeners if not already done
        if (!this.profileTabsInitialized) {
            document.querySelectorAll('.profile-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const profileTab = btn.dataset.profileTab;
                    this.showProfileTab(profileTab);
                });
            });
            this.profileTabsInitialized = true;
        }
        
        // Show default tab (profile details)
        this.showProfileTab('profile-details');
    }

    showProfileTab(tabName) {
        // Hide all profile tabs
        document.querySelectorAll('.profile-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all profile tab buttons
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected profile tab
        let targetTabId = `${tabName}-tab`;
        if (tabName === 'products') {
            targetTabId = 'products-profile-tab'; // Special case for products tab
        }
        
        const targetTab = document.getElementById(targetTabId);
        if (targetTab) {
            targetTab.classList.add('active');
        } else {
            console.error('Target tab not found:', targetTabId);
        }
        
        const targetBtn = document.querySelector(`[data-profile-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        // Handle specific tab initialization
        if (tabName === 'products') {
            console.log('Switching to products tab');
            this.updateCurrentProfileName();
            this.loadProfileProducts();
        }
    }

    updateCurrentProfileName() {
        const currentProfileNameSpan = document.getElementById('current-profile-name');
        if (currentProfileNameSpan) {
            if (this.currentProfile) {
                currentProfileNameSpan.textContent = this.currentProfile;
            } else {
                currentProfileNameSpan.textContent = 'Ingen profil valgt';
            }
        }
    }

    async loadProfileProducts() {
        console.log('loadProfileProducts called, currentProfile:', this.currentProfile);
        
        // Load products for the current profile
        if (!this.currentProfile) {
            const productsList = document.getElementById('products-list');
            if (productsList) {
                productsList.innerHTML = '<p class="text-muted">Vælg en profil for at se produkter</p>';
            }
            return;
        }
        
        // Load products from server and then update the display
        await this.loadProducts();
    }

    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    // Progress animation for translation
    startProgressAnimation(progressBar, statusDiv, startTime) {
        let progress = 0;
        let step = 0;
        
        this.progressAnimationInterval = setInterval(() => {
            step++;
            
            // Simulate progress with different phases
            if (step < 10) {
                progress = step * 2; // 0-20% quickly
            } else if (step < 50) {
                progress = 20 + (step - 10) * 1.5; // 20-80% slowly
            } else {
                progress = Math.min(95, 80 + (step - 50) * 0.3); // 80-95% very slowly
            }
            
            if (progressBar) {
                progressBar.querySelector('.progress-fill').style.width = `${progress}%`;
            }
            
            if (statusDiv) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const estimated = Math.max(30, Math.floor(elapsed / (progress / 100)) - elapsed);
                
                const statusText = step < 5 ? '🚀 Starter oversættelse...' :
                                 step < 15 ? '📝 Analyserer CSV filer...' :
                                 step < 25 ? '🌍 Forbereder sprog...' :
                                 step < 40 ? '⚡ Oversætter indhold...' :
                                 '🔄 Færdiggør oversættelse...';
                
                const progressCounter = `${Math.floor(progress)}% fuldført`;
                const timeEstimate = progress < 95 ? `Ca. ${estimated} sek. tilbage` : 'Næsten færdig...';
                
                if (statusDiv.querySelector('.status-text')) {
                    statusDiv.querySelector('.status-text').textContent = statusText;
                    statusDiv.querySelector('.progress-counter').textContent = progressCounter;
                    statusDiv.querySelector('.time-estimate').textContent = timeEstimate;
                }
            }
        }, 500);
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // Import/Export functionality
    async importProfiles() {
        try {
            // Create file input element
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            
            fileInput.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                const formData = new FormData();
                formData.append('file', file);
                
                this.showLoading();
                
                try {
                    const response = await fetch('/api/profiles/import', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        this.showToast(result.message || 'Profiler importeret succesfuldt', 'success');
                        // Reload profiles and other data
                        await this.loadProfiles();
                        await this.loadProducts();
                        await this.loadSavedTexts();
                    } else {
                        throw new Error(result.error || 'Import fejlede');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    this.showToast('Fejl ved import: ' + error.message, 'error');
                } finally {
                    this.hideLoading();
                    // Clean up
                    document.body.removeChild(fileInput);
                }
            };
            
            // Add to DOM and trigger click
            document.body.appendChild(fileInput);
            fileInput.click();
            
        } catch (error) {
            console.error('Error setting up import:', error);
            this.showToast('Fejl ved opsætning af import', 'error');
        }
    }

    async exportProfiles() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/profiles/export', {
                method: 'GET'
            });
            
            if (response.ok) {
                // Create download link
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'seo_profiles_export.json';
                a.style.display = 'none';
                
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Clean up
                window.URL.revokeObjectURL(url);
                
                this.showToast('Profiler eksporteret succesfuldt', 'success');
            } else {
                const result = await response.json();
                throw new Error(result.error || 'Export fejlede');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Fejl ved eksport: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Product modal methods
    showProductModal(productIndex = null) {
        if (!this.currentProfile) {
            this.showToast('Vælg først en profil', 'warning');
            return;
        }

        // Store the product index for editing
        this.editingProductIndex = productIndex;
        
        // Set modal title and clear form
        const modalTitle = document.getElementById('product-modal-title');
        const nameInput = document.getElementById('product-modal-name');
        const urlInput = document.getElementById('product-modal-url');
        const descriptionInput = document.getElementById('product-modal-description');
        
        if (productIndex !== null && this.products[productIndex]) {
            // Editing existing product
            const product = this.products[productIndex];
            modalTitle.textContent = '✏️ Rediger Produkt';
            nameInput.value = product.name || '';
            urlInput.value = product.url || '';
            descriptionInput.value = product.description || '';
        } else {
            // Adding new product
            modalTitle.textContent = '➕ Tilføj Produkt';
            nameInput.value = '';
            urlInput.value = '';
            descriptionInput.value = '';
        }
        
        this.showModal('product-modal');
        nameInput.focus();
        
        // Add Enter key support for the form
        const form = document.getElementById('product-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            this.saveProductFromModal();
        };
    }

    async saveProductFromModal() {
        const nameInput = document.getElementById('product-modal-name');
        const urlInput = document.getElementById('product-modal-url');
        const descriptionInput = document.getElementById('product-modal-description');
        
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        const description = descriptionInput.value.trim();
        
        if (!name) {
            this.showToast('Produktnavn er påkrævet', 'warning');
            nameInput.focus();
            return;
        }
        
        // Check for duplicate product names (only when adding new product)
        if (this.editingProductIndex === null) {
            const existingProduct = this.products.find(product => 
                product.name.toLowerCase() === name.toLowerCase()
            );
            
            if (existingProduct) {
                this.showToast('Et produkt med dette navn eksisterer allerede', 'warning');
                nameInput.focus();
                nameInput.select();
                return;
            }
        }
        
        const productData = {
            name: name,
            url: url,
            description: description
        };
        
        try {
            let response;
            
            if (this.editingProductIndex !== null) {
                // Update existing product
                response = await fetch(`/api/profiles/${encodeURIComponent(this.currentProfile)}/products/${this.editingProductIndex}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
            } else {
                // Add new product
                response = await fetch(`/api/profiles/${encodeURIComponent(this.currentProfile)}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
            }
            
            if (response.ok) {
                const action = this.editingProductIndex !== null ? 'opdateret' : 'tilføjet';
                this.showToast(`Produkt ${action}!`, 'success');
                this.hideModal('product-modal');
                this.loadProducts();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save product');
            }
        } catch (error) {
            this.showToast('Fejl ved gemning af produkt: ' + error.message, 'error');
        }
    }

    // Legacy method for backward compatibility
    async addProduct() {
        this.showProductModal();
    }

    async fetchProductsFromURLs() {
        if (!this.currentProfile) {
            this.showToast('Vælg først en profil', 'warning');
            return;
        }

        const urls = prompt('Indtast URL\'er (én pr. linje):');
        if (!urls) return;
        
        this.showLoading();
        
        try {
            const response = await fetch('/api/fetch-url-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: urls })
            });
            
            const data = await response.json();
            
            if (response.ok && data.products) {
                // Add each fetched product to the current profile
                let addedCount = 0;
                let skippedCount = 0;
                
                for (const product of data.products) {
                    try {
                        const addResponse = await fetch(`/api/profiles/${encodeURIComponent(this.currentProfile)}/products`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(product)
                        });
                        
                        if (addResponse.ok) {
                            addedCount++;
                        } else {
                            const errorData = await addResponse.json();
                            if (errorData.error && errorData.error.includes('already exists')) {
                                skippedCount++;
                                console.log('Skipped duplicate product:', product.name);
                            } else {
                                console.error('Failed to add product:', product.name, errorData.error);
                            }
                        }
                    } catch (error) {
                        console.error('Error adding product:', error);
                    }
                }
                
                let message = `${addedCount} produkter tilføjet!`;
                if (skippedCount > 0) {
                    message += ` (${skippedCount} duplikater sprunget over)`;
                }
                
                this.showToast(message, 'success');
                this.loadProducts();
            } else {
                throw new Error(data.error || 'Failed to fetch products');
            }
        } catch (error) {
            this.showToast('Fejl ved hentning af produkter: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    filterSavedTexts(searchQuery = null) {
        const items = document.querySelectorAll('.saved-text-item');
        const searchTerm = (searchQuery || document.getElementById('text-search').value).toLowerCase().trim();
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        const sortOrder = document.getElementById('sort-order').value;
        
        // Convert items to array for sorting
        const itemsArray = Array.from(items);
        
        // Filter items
        const filteredItems = itemsArray.filter(item => {
            // Text search
            const title = item.querySelector('h4').textContent.toLowerCase();
            const preview = item.querySelector('.text-preview').textContent.toLowerCase();
            const meta = item.querySelector('.text-meta').textContent.toLowerCase();
            
            const textMatches = !searchTerm || 
                              title.includes(searchTerm) || 
                              preview.includes(searchTerm) || 
                              meta.includes(searchTerm);
            
            // Date filtering
            const dateElement = item.querySelector('.text-date');
            let dateMatches = true;
            if (dateElement && (dateFrom || dateTo)) {
                const itemDate = new Date(dateElement.textContent);
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    dateMatches = dateMatches && (itemDate >= fromDate);
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999); // End of day
                    dateMatches = dateMatches && (itemDate <= toDate);
                }
            }
            
            return textMatches && dateMatches;
        });
        
        // Sort filtered items
        filteredItems.sort((a, b) => {
            switch (sortOrder) {
                case 'newest':
                    const dateA = new Date(a.querySelector('.text-date')?.textContent || 0);
                    const dateB = new Date(b.querySelector('.text-date')?.textContent || 0);
                    return dateB - dateA;
                case 'oldest':
                    const dateA2 = new Date(a.querySelector('.text-date')?.textContent || 0);
                    const dateB2 = new Date(b.querySelector('.text-date')?.textContent || 0);
                    return dateA2 - dateB2;
                case 'alphabetical':
                    const titleA = a.querySelector('h4').textContent.toLowerCase();
                    const titleB = b.querySelector('h4').textContent.toLowerCase();
                    return titleA.localeCompare(titleB);
                default:
                    return 0;
            }
        });
        
        // Hide all items first
        items.forEach(item => item.style.display = 'none');
        
        // Show and reorder filtered items
        const container = document.getElementById('texts-list-container');
        filteredItems.forEach(item => {
            item.style.display = 'block';
            container.appendChild(item); // This reorders the element
        });
        
        // Update statistics
        const totalCount = items.length;
        const filteredCount = filteredItems.length;
        
        document.getElementById('total-texts-count').textContent = `${totalCount} tekster`;
        const filteredCountElement = document.getElementById('filtered-texts-count');
        if (filteredCount !== totalCount) {
            filteredCountElement.textContent = `(${filteredCount} vises)`;
            filteredCountElement.style.display = 'inline';
        } else {
            filteredCountElement.style.display = 'none';
        }
        
        // Show/hide no results message
        const noResults = container.querySelector('.no-results');
        if (filteredItems.length === 0 && (searchTerm || dateFrom || dateTo)) {
            if (!noResults) {
                const noResultsDiv = document.createElement('div');
                noResultsDiv.className = 'no-results text-muted text-center';
                noResultsDiv.innerHTML = '<p>🔍 Ingen tekster matcher dine filtre</p>';
                container.appendChild(noResultsDiv);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    clearFilters() {
        document.getElementById('text-search').value = '';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        document.getElementById('sort-order').value = 'newest';
        this.filterSavedTexts();
    }

    editSelectedText() {
        // Get the currently selected text from the preview
        const previewContent = document.getElementById('text-preview-content');
        if (!previewContent || previewContent.innerHTML.includes('Vælg en tekst')) {
            this.showToast('Vælg først en tekst at redigere', 'warning');
            return;
        }
        
        // Find the text name from the preview content
        const titleElement = previewContent.querySelector('h2');
        if (titleElement) {
            const textName = titleElement.textContent;
            this.editSavedText(textName);
        } else {
            this.showToast('Kunne ikke identificere teksten', 'error');
        }
    }

    deleteSelectedText() {
        // Get the currently selected text from the preview
        const previewContent = document.getElementById('text-preview-content');
        if (!previewContent || previewContent.innerHTML.includes('Vælg en tekst')) {
            this.showToast('Vælg først en tekst at slette', 'warning');
            return;
        }
        
        // Find the text name from the preview content
        const titleElement = previewContent.querySelector('h2');
        if (titleElement) {
            const textName = titleElement.textContent;
            this.deleteSavedText(textName);
        } else {
            this.showToast('Kunne ikke identificere teksten', 'error');
        }
    }

    setupTranslatorListeners() {
        // CSV upload button
        const uploadCsvBtn = document.getElementById('upload-csv-btn');
        const csvUpload = document.getElementById('csv-upload');
        const csvDropZone = document.getElementById('csv-drop-zone');
        
        if (uploadCsvBtn && csvUpload) {
            uploadCsvBtn.addEventListener('click', () => {
                csvUpload.click();
            });

            csvUpload.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    this.handleMultipleCSVUpload(files);
                }
            });
        }

        // Drag and drop functionality
        if (csvDropZone) {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                csvDropZone.addEventListener(eventName, this.preventDefaults, false);
                document.body.addEventListener(eventName, this.preventDefaults, false);
            });

            // Highlight drop zone when item is dragged over it
            ['dragenter', 'dragover'].forEach(eventName => {
                csvDropZone.addEventListener(eventName, () => this.highlight(csvDropZone), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                csvDropZone.addEventListener(eventName, () => this.unhighlight(csvDropZone), false);
            });

            // Handle dropped files
            csvDropZone.addEventListener('drop', (e) => this.handleDrop(e), false);

            // Click to upload
            csvDropZone.addEventListener('click', () => {
                if (csvUpload) csvUpload.click();
            });
        }

        // File management buttons
        const viewFilesBtn = document.getElementById('view-files-btn');
        const filterUntranslatedBtn = document.getElementById('filter-untranslated-btn');
        const exportUntranslatedBtn = document.getElementById('export-untranslated-btn');

        if (viewFilesBtn) {
            viewFilesBtn.addEventListener('click', () => {
                this.showCSVPreviewModal();
            });
        }

        if (filterUntranslatedBtn) {
            filterUntranslatedBtn.addEventListener('click', () => {
                this.filterUntranslatedRows();
            });
        }

        if (exportUntranslatedBtn) {
            exportUntranslatedBtn.addEventListener('click', () => {
                this.exportUntranslatedRows();
            });
        }

        // Start translation button
        const startTranslationBtn = document.getElementById('start-translation-btn');
        if (startTranslationBtn) {
            startTranslationBtn.addEventListener('click', () => {
                this.startTranslation();
            });
        }

        // Download translated CSV button
        const downloadTranslatedBtn = document.getElementById('download-translated-btn');
        if (downloadTranslatedBtn) {
            downloadTranslatedBtn.addEventListener('click', () => {
                this.downloadTranslatedCSV();
            });
        }

        // CSV Preview Modal close button
        const closePreviewBtn = document.getElementById('close-preview-btn');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => {
                this.hideModal('csv-preview-modal');
            });
        }

        // Quick text translator listeners
        this.setupQuickTranslatorListeners();
    }

    // Drag and drop helper methods
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(element) {
        element.classList.add('drag-over');
    }

    unhighlight(element) {
        element.classList.remove('drag-over');
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);

        if (files.length > 0) {
            // Validate all files are CSV
            const invalidFiles = files.filter(file => !file.name.toLowerCase().endsWith('.csv'));
            if (invalidFiles.length > 0) {
                this.showToast(`Kun CSV-filer er tilladt. Følgende filer blev ignoreret: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
                return;
            }
            
            this.handleMultipleCSVUpload(files);
        }
    }

    removeUploadedFile() {
        const csvDropZone = document.getElementById('csv-drop-zone');
        const uploadedFileInfo = document.getElementById('uploaded-file-info');
        const dropZoneContent = csvDropZone.querySelector('.drop-zone-content');
        const csvUpload = document.getElementById('csv-upload');
        const startTranslationBtn = document.getElementById('start-translation-btn');
        const downloadTranslatedBtn = document.getElementById('download-translated-btn');
        const statusDiv = document.getElementById('translation-status');
        const languageSelection = document.querySelector('.language-selection');

        // Reset file input
        if (csvUpload) csvUpload.value = '';

        // Show drop zone, hide file info
        if (dropZoneContent) dropZoneContent.style.display = 'flex';
        if (uploadedFileInfo) uploadedFileInfo.style.display = 'none';

        // Reset buttons and status
        if (startTranslationBtn) {
            startTranslationBtn.disabled = true;
            startTranslationBtn.style.display = 'inline-block';
        }
        if (downloadTranslatedBtn) downloadTranslatedBtn.disabled = true;
        if (statusDiv) statusDiv.innerHTML = '';
        
        // Hide language selection
        if (languageSelection) {
            const formGroup = languageSelection.closest('.form-group');
            if (formGroup) formGroup.style.display = 'none';
        }

        // Clear stored data
        this.csvData = null;

        this.showToast('Fil fjernet', 'success');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    setupQuickTranslatorListeners() {
        const quickTranslateInput = document.getElementById('quick-translate-input');
        const quickTranslateBtn = document.getElementById('quick-translate-btn');
        const targetLanguageSelect = document.getElementById('target-language-select');
        const inputCharCount = document.getElementById('input-char-count');
        const outputCharCount = document.getElementById('output-char-count');
        const copyTranslationBtn = document.getElementById('copy-translation-btn');
        const clearTranslationBtn = document.getElementById('clear-translation-btn');

        if (!quickTranslateInput || !quickTranslateBtn) return;

        // Update character count and enable/disable button
        quickTranslateInput.addEventListener('input', () => {
            const text = quickTranslateInput.value;
            const charCount = text.length;
            inputCharCount.textContent = `${charCount} tegn`;
            
            // Enable button if there's text
            quickTranslateBtn.disabled = charCount === 0;
        });

        // Quick translate button
        quickTranslateBtn.addEventListener('click', () => {
            this.performQuickTranslation();
        });

        // Copy translation button
        if (copyTranslationBtn) {
            copyTranslationBtn.addEventListener('click', () => {
                const outputTextarea = document.getElementById('quick-translate-output');
                if (outputTextarea && outputTextarea.value) {
                    navigator.clipboard.writeText(outputTextarea.value).then(() => {
                        this.showToast('Oversættelse kopieret til udklipsholder!', 'success');
                    }).catch(() => {
                        // Fallback for older browsers
                        outputTextarea.select();
                        document.execCommand('copy');
                        this.showToast('Oversættelse kopieret!', 'success');
                    });
                }
            });
        }

        // Clear translation button
        if (clearTranslationBtn) {
            clearTranslationBtn.addEventListener('click', () => {
                quickTranslateInput.value = '';
                document.getElementById('quick-translate-output').value = '';
                inputCharCount.textContent = '0 tegn';
                outputCharCount.textContent = '0 tegn';
                quickTranslateBtn.disabled = true;
            });
        }
    }

    async handleCSVUpload(file) {
        console.log('📁 Uploading CSV file:', file.name);
        
        const progressBar = document.getElementById('translation-progress-bar');
        const statusDiv = document.getElementById('translation-status');
        const uploadedFileName = document.getElementById('uploaded-file-name');
        const uploadedFileSize = document.getElementById('uploaded-file-size');
        const uploadedFileInfo = document.getElementById('uploaded-file-info');
        const csvDropZone = document.getElementById('csv-drop-zone');
        const dropZoneContent = csvDropZone.querySelector('.drop-zone-content');
        const languageSelection = document.querySelector('.language-selection');
        const startTranslationBtn = document.getElementById('start-translation-btn');
        const downloadTranslatedBtn = document.getElementById('download-translated-btn');
        
        try {
            // Show progress
            if (progressBar) {
                progressBar.style.display = 'block';
                progressBar.querySelector('.progress-fill').style.width = '20%';
            }
            if (statusDiv) statusDiv.textContent = 'Uploader CSV-fil...';
            
            // Create form data
            const formData = new FormData();
            formData.append('csv_file', file);
            
            const response = await fetch('/api/upload-csv', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ CSV uploaded successfully:', result);
                
                // Store the CSV data
                this.csvData = result;
                
                // Show uploaded files info and file management section
                this.showUploadedFilesInfo(result);
                this.showFileManagementSection(result);
                
                // Update language checkboxes based on available locales
                if (languageSelection && result.available_locales) {
                    this.updateLanguageSelection(result.available_locales, result.locale_stats);
                }
                
                // Enable start translation button
                if (startTranslationBtn) {
                    startTranslationBtn.disabled = false;
                }
                
                // Check if there are existing translations
                const hasExistingTranslations = this.checkForExistingTranslations(result.locale_stats);
                
                if (statusDiv) {
                    statusDiv.innerHTML = `
                        <div class="upload-success">
                            <strong>✅ CSV uploaded succesfuldt!</strong><br>
                            📄 ${result.total_rows} rækker indlæst<br>
                            🌍 ${result.available_locales.length} sprog fundet
                            ${hasExistingTranslations ? `
                                <div class="mt-3 p-3" style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px;">
                                    <strong>🎉 Eksisterende oversættelser fundet!</strong><br>
                                    <small>Du kan springe oversættelsen over og gå direkte til redigering.</small>
                                    <div class="mt-2">
                                        <button class="btn btn-success btn-sm mr-2" onclick="handleSkipToPreview()">
                                            <i class="fas fa-eye"></i> Gå til redigering
                                        </button>
                                        <button class="btn btn-outline-primary btn-sm" onclick="handleShowLanguageSelection()">
                                            <i class="fas fa-language"></i> Oversæt flere sprog
                                        </button>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }
                
                this.showToast(`CSV-fil "${result.uploaded_files[0].filename}" uploaded succesfuldt!`, 'success');
                
                // If there are existing translations, hide language selection initially
                if (hasExistingTranslations) {
                    const languageSelection = document.querySelector('.language-selection');
                    if (languageSelection) {
                        languageSelection.closest('.form-group').style.display = 'none';
                    }
                    
                    // Disable start translation button since we can skip
                    if (startTranslationBtn) {
                        startTranslationBtn.style.display = 'none';
                    }
                }
                
            } else {
                throw new Error(result.error || 'Upload fejlede');
            }
            
        } catch (error) {
            console.error('❌ CSV upload error:', error);
            
            // Show drop zone again, hide file info
            if (dropZoneContent) dropZoneContent.style.display = 'flex';
            if (uploadedFileInfo) uploadedFileInfo.style.display = 'none';
            
            if (statusDiv) {
                statusDiv.innerHTML = `<div class="upload-error">❌ ${error.message}</div>`;
            }
            
            this.showToast(`Upload fejl: ${error.message}`, 'error');
            
        } finally {
            // Hide progress
            if (progressBar) {
                setTimeout(() => {
                    progressBar.style.display = 'none';
                }, 1000);
            }
        }
    }

    async handleMultipleCSVUpload(files) {
        // Prevent duplicate uploads
        if (this.isUploading) {
            console.log('Upload already in progress, ignoring duplicate call');
            return;
        }
        this.isUploading = true;
        
        const formData = new FormData();
        files.forEach(file => {
            formData.append('csv_file', file);
        });

        try {
            this.showLoading();
            
            const response = await fetch('/api/upload-csv', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(`${data.total_files} CSV-filer uploaded succesfuldt`, 'success');
                
                // Update UI to show uploaded files
                this.showUploadedFilesInfo(data);
                
                // Store CSV data for later use
                this.csvData = data;
                
                // Show file management section
                this.showFileManagementSection(data);
                
                // Show language selection if there are available locales
                if (data.available_locales && data.available_locales.length > 0) {
                    this.updateLanguageSelection(data.available_locales, data.locale_stats || {});
                    
                    // Show the language selection section
                    const languageSelection = document.querySelector('.language-selection');
                    if (languageSelection) {
                        const formGroup = languageSelection.closest('.form-group');
                        if (formGroup) formGroup.style.display = 'block';
                    }
                    
                    // Enable start translation button
                    const startTranslationBtn = document.getElementById('start-translation-btn');
                    if (startTranslationBtn) {
                        startTranslationBtn.disabled = false;
                        startTranslationBtn.style.display = 'inline-block';
                    }
                }
                
            } else {
                this.showToast(data.error || 'Fejl ved upload af CSV-filer', 'error');
            }
        } catch (error) {
            console.error('Error uploading CSV files:', error);
            this.showToast('Fejl ved upload af CSV-filer', 'error');
        } finally {
            this.hideLoading();
            // Reset upload flag
            this.isUploading = false;
        }
    }

    showUploadedFilesInfo(data) {
        const csvDropZone = document.getElementById('csv-drop-zone');
        const dropZoneContent = csvDropZone.querySelector('.drop-zone-content');
        const uploadedFilesList = document.getElementById('uploaded-files-list');

        // Hide drop zone content
        if (dropZoneContent) dropZoneContent.style.display = 'none';

        // Show uploaded files list
        if (uploadedFilesList) {
            uploadedFilesList.innerHTML = '';
            uploadedFilesList.style.display = 'block';

            data.uploaded_files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'uploaded-file-item';
                fileItem.innerHTML = `
                    <div class="file-icon">📄</div>
                    <div class="file-details">
                        <span class="file-name">${file.filename}</span>
                        <div class="file-stats">
                            ${file.total_rows} rækker • ${file.untranslated_rows} mangler oversættelse
                        </div>
                    </div>
                    <button class="remove-file-btn" onclick="seoGenerator.removeCSVFile('${file.id}')" title="Fjern fil">
                        ×
                    </button>
                `;
                uploadedFilesList.appendChild(fileItem);
            });
        }
    }

    showFileManagementSection(data) {
        const fileManagementSection = document.getElementById('file-management-section');
        const fileStats = document.getElementById('file-stats');
        const viewFilesBtn = document.getElementById('view-files-btn');
        const filterUntranslatedBtn = document.getElementById('filter-untranslated-btn');
        const exportUntranslatedBtn = document.getElementById('export-untranslated-btn');

        if (fileManagementSection) {
            fileManagementSection.style.display = 'block';
        }

        if (fileStats) {
            fileStats.textContent = `${data.total_files} filer • ${data.total_rows} rækker • ${data.total_untranslated} mangler oversættelse`;
        }

        // Enable buttons
        if (viewFilesBtn) viewFilesBtn.disabled = false;
        if (filterUntranslatedBtn) filterUntranslatedBtn.disabled = data.total_untranslated === 0;
        if (exportUntranslatedBtn) exportUntranslatedBtn.disabled = data.total_untranslated === 0;
    }

    async removeCSVFile(fileId) {
        try {
            console.log('Removing CSV file with ID:', fileId);
            
            const response = await fetch('/api/remove-csv-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ file_id: fileId })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
                // Refresh the files display
                await this.refreshFilesDisplay();
            } else {
                this.showToast(data.error || 'Fejl ved fjernelse af fil', 'error');
            }
        } catch (error) {
            console.error('Error removing CSV file:', error);
            this.showToast(`Fejl ved fjernelse af fil: ${error.message}`, 'error');
        }
    }

    async refreshFilesDisplay() {
        try {
            const response = await fetch('/api/csv-preview');
            const data = await response.json();

            if (data.files && Object.keys(data.files).length > 0) {
                // Update the display with remaining files
                const uploadedFiles = Object.entries(data.files).map(([id, file]) => ({
                    id: id,
                    filename: file.filename,
                    total_rows: file.total_rows,
                    untranslated_rows: file.untranslated_rows
                }));

                const totalRows = Object.values(data.files).reduce((sum, file) => sum + file.total_rows, 0);
                const totalUntranslated = Object.values(data.files).reduce((sum, file) => sum + file.untranslated_rows, 0);

                this.showUploadedFilesInfo({ uploaded_files: uploadedFiles });
                this.showFileManagementSection({
                    total_files: data.total_files,
                    total_rows: totalRows,
                    total_untranslated: totalUntranslated
                });
            } else {
                // No files left, reset to initial state
                this.resetToInitialState();
            }
        } catch (error) {
            console.error('Error refreshing files display:', error);
        }
    }

    resetToInitialState() {
        const csvDropZone = document.getElementById('csv-drop-zone');
        const dropZoneContent = csvDropZone.querySelector('.drop-zone-content');
        const uploadedFilesList = document.getElementById('uploaded-files-list');
        const fileManagementSection = document.getElementById('file-management-section');
        const csvUpload = document.getElementById('csv-upload');

        // Show drop zone, hide files list
        if (dropZoneContent) dropZoneContent.style.display = 'flex';
        if (uploadedFilesList) uploadedFilesList.style.display = 'none';
        if (fileManagementSection) fileManagementSection.style.display = 'none';
        if (csvUpload) csvUpload.value = '';

        // Clear stored data
        this.csvData = null;
    }

    async showCSVPreviewModal() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/csv-preview');
            const data = await response.json();

            if (data.files) {
                this.displayCSVPreview(data.files);
                this.showModal('csv-preview-modal');
            } else {
                this.showToast(data.error || 'Ingen CSV data fundet', 'error');
            }
        } catch (error) {
            console.error('Error loading CSV preview:', error);
            this.showToast('Fejl ved indlæsning af preview', 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayCSVPreview(files) {
        const csvFilesTabs = document.getElementById('csv-files-tabs');
        const csvPreviewContent = document.getElementById('csv-preview-content');

        if (!csvFilesTabs || !csvPreviewContent) return;

        // Clear existing content
        csvFilesTabs.innerHTML = '';
        csvPreviewContent.innerHTML = '';

        const fileIds = Object.keys(files);
        
        // Create tabs for each file
        fileIds.forEach((fileId, index) => {
            const file = files[fileId];
            const tab = document.createElement('div');
            tab.className = `csv-file-tab ${index === 0 ? 'active' : ''}`;
            tab.textContent = file.filename;
            tab.onclick = () => this.showCSVFilePreview(fileId, files);
            csvFilesTabs.appendChild(tab);
        });

        // Show first file by default
        if (fileIds.length > 0) {
            this.showCSVFilePreview(fileIds[0], files);
        }
    }

    showCSVFilePreview(fileId, files) {
        const file = files[fileId];
        const csvPreviewContent = document.getElementById('csv-preview-content');
        const csvFilesTabs = document.getElementById('csv-files-tabs');

        // Update active tab
        csvFilesTabs.querySelectorAll('.csv-file-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.textContent === file.filename) {
                tab.classList.add('active');
            }
        });

        // Create table
        if (file.data && file.data.length > 0) {
            const table = document.createElement('table');
            table.className = 'csv-preview-table';

            // Create header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            file.columns.forEach(column => {
                const th = document.createElement('th');
                th.textContent = column;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create body
            const tbody = document.createElement('tbody');
            file.data.forEach(row => { // Show all rows
                const tr = document.createElement('tr');
                
                // Check if row needs translation
                const needsTranslation = !row['translated content'] || 
                                       row['translated content'].toString().trim() === '' ||
                                       row['translated content'] === 'nan';
                
                if (needsTranslation) {
                    tr.classList.add('needs-translation');
                } else {
                    tr.classList.add('has-translation');
                }

                file.columns.forEach(column => {
                    const td = document.createElement('td');
                    td.textContent = row[column] || '';
                    td.title = row[column] || '';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            csvPreviewContent.innerHTML = '';
            csvPreviewContent.appendChild(table);

            // Add summary
            const summary = document.createElement('div');
            summary.style.padding = '1rem';
            summary.style.background = '#f8f9fa';
            summary.style.borderTop = '1px solid #dee2e6';
            summary.innerHTML = `
                <strong>Oversigt:</strong> ${file.total_rows} rækker i alt, 
                ${file.untranslated_rows} mangler oversættelse
            `;
            csvPreviewContent.appendChild(summary);
        }
    }

    async filterUntranslatedRows() {
        // Prevent duplicate filtering
        if (this.isFiltering) {
            console.log('Filtering already in progress, ignoring duplicate call');
            return;
        }
        this.isFiltering = true;
        
        try {
            this.showLoading();
            
            const response = await fetch('/api/filter-untranslated', {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
                
                // Update UI to show filtered data is ready for translation
                const startTranslationBtn = document.getElementById('start-translation-btn');
                if (startTranslationBtn) {
                    startTranslationBtn.disabled = false;
                    startTranslationBtn.textContent = `Oversæt ${data.untranslated_rows} rækker`;
                    startTranslationBtn.style.display = 'inline-block';
                }
                
                // Show language selection with available locales
                const languageSelection = document.querySelector('.language-selection');
                if (languageSelection) {
                    const formGroup = languageSelection.closest('.form-group');
                    if (formGroup) formGroup.style.display = 'block';
                    
                    // Update language selection with filtered data statistics
                    if (data.available_locales && data.locale_stats) {
                        this.updateLanguageSelection(data.available_locales, data.locale_stats);
                    }
                }
                
                // Store filtered data with correct statistics
                this.csvData = { 
                    success: true, 
                    total_rows: data.untranslated_rows,
                    available_locales: data.available_locales || [],
                    locale_stats: data.locale_stats || {}
                };
                
            } else {
                this.showToast(data.error || 'Fejl ved filtrering', 'error');
            }
        } catch (error) {
            console.error('Error filtering untranslated rows:', error);
            this.showToast('Fejl ved filtrering', 'error');
        } finally {
            this.hideLoading();
            // Reset filtering flag
            this.isFiltering = false;
        }
    }

    async exportUntranslatedRows() {
        // Prevent duplicate exports
        if (this.isExporting) {
            console.log('Export already in progress, ignoring duplicate call');
            return;
        }
        this.isExporting = true;
        
        try {
            this.showLoading();
            
            const response = await fetch('/api/export-untranslated');
            
            if (response.ok) {
                // Create download link
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // Get filename from response headers
                const contentDisposition = response.headers.get('Content-Disposition');
                const filename = contentDisposition 
                    ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                    : 'untranslated_rows.csv';
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showToast('Uoversatte rækker eksporteret', 'success');
            } else {
                const data = await response.json();
                this.showToast(data.error || 'Fejl ved eksport', 'error');
            }
        } catch (error) {
            console.error('Error exporting untranslated rows:', error);
            this.showToast('Fejl ved eksport', 'error');
        } finally {
            this.hideLoading();
            // Reset export flag
            this.isExporting = false;
        }
    }

    updateLanguageSelection(availableLocales, localeStats) {
        const languageSelection = document.querySelector('.language-selection');
        if (!languageSelection) return;
        
        // Define language mapping
        const languageMap = {
            'da': 'Dansk',
            'en': 'Engelsk', 
            'de': 'Tysk',
            'fr': 'Fransk',
            'es': 'Spansk',
            'it': 'Italiensk',
            'sv': 'Svensk',
            'no': 'Norsk',
            'nl': 'Hollandsk',
            'fi': 'Finsk',
            'pl': 'Polsk',
            'pt': 'Portugisisk',
            'ru': 'Russisk',
            'zh': 'Kinesisk',
            'ja': 'Japansk',
            'ko': 'Koreansk'
        };
        
        // Clear existing checkboxes
        languageSelection.innerHTML = '';
        
        // Add checkboxes for available locales
        availableLocales.forEach(locale => {
            const stats = localeStats[locale] || {};
            const displayName = languageMap[locale] || locale.toUpperCase();
            const needsTranslation = stats.needs_translation || 0;
            const totalRows = stats.total_rows || 0;
            
            const label = document.createElement('label');
            label.innerHTML = `
                <input type="checkbox" value="${locale}" ${needsTranslation > 0 ? 'checked' : ''}>
                ${displayName}
                <small style="display: block; font-size: 11px; color: #666;">
                    ${needsTranslation}/${totalRows} mangler oversættelse
                </small>
            `;
            
            languageSelection.appendChild(label);
        });
    }

    async startTranslation() {
        console.log('🚀 Starting translation process...');
        
        // Prevent duplicate translation calls
        if (this.isTranslating) {
            console.log('Translation already in progress, ignoring duplicate call');
            return;
        }
        this.isTranslating = true;
        
        if (!this.currentProfile) {
            this.showToast('Vælg venligst en profil først', 'error');
            this.isTranslating = false;
            return;
        }
        
        // Check if we have CSV data (either single file or multiple files)
        if (!this.csvData) {
            this.showToast('Upload en CSV-fil først', 'error');
            return;
        }
        
        // Get selected languages
        const selectedLanguages = [];
        const languageCheckboxes = document.querySelectorAll('.language-selection input[type="checkbox"]:checked');
        languageCheckboxes.forEach(checkbox => {
            selectedLanguages.push(checkbox.value);
        });
        
        if (selectedLanguages.length === 0) {
            this.showToast('Vælg mindst ét sprog til oversættelse', 'error');
            return;
        }
        
        const progressBar = document.getElementById('translation-progress-bar');
        const statusDiv = document.getElementById('translation-status');
        const startTranslationBtn = document.getElementById('start-translation-btn');
        const downloadTranslatedBtn = document.getElementById('download-translated-btn');
        
        try {
            // Show progress
            if (progressBar) {
                progressBar.style.display = 'block';
                progressBar.querySelector('.progress-fill').style.width = '0%';
            }
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="translation-status-container">
                        <div class="status-text">🚀 Starter oversættelse...</div>
                        <div class="progress-info">
                            <span class="progress-counter">Forbereder...</span>
                            <span class="time-estimate">Estimeret tid: Beregner...</span>
                        </div>
                    </div>
                `;
            }
            if (startTranslationBtn) {
                startTranslationBtn.disabled = true;
                startTranslationBtn.textContent = 'Oversætter...';
            }
            
            // Start progress animation
            const startTime = Date.now();
            this.startProgressAnimation(progressBar, statusDiv, startTime);
            
            // Call the translation API
            const response = await fetch('/api/translate-csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile_name: this.currentProfile,
                    selected_locales: selectedLanguages
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Clear animation interval
                if (this.progressAnimationInterval) {
                    clearInterval(this.progressAnimationInterval);
                }
                
                // Update progress to 100%
                if (progressBar) {
                    progressBar.querySelector('.progress-fill').style.width = '100%';
                }
                
                if (statusDiv) {
                    statusDiv.innerHTML = `
                        <div class="translation-success" style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 10px 0;">
                            <h4 style="color: #155724; margin: 0 0 10px 0;">✅ Oversættelse fuldført!</h4>
                            <div style="color: #155724;">
                                📝 <strong>${result.translated_count} rækker blev oversat</strong><br>
                                🌍 Sprog: ${selectedLanguages.join(', ')}<br>
                                ${result.errors && result.errors.length > 0 ? 
                                    `⚠️ ${result.errors.length} fejl opstod` : 
                                    '🎉 Ingen fejl opstod'}
                            </div>
                        </div>
                    `;
                }
                
                // Enable download button
                if (downloadTranslatedBtn) {
                    downloadTranslatedBtn.disabled = false;
                    downloadTranslatedBtn.style.display = 'inline-block';
                }
                
                // Update start button
                if (startTranslationBtn) {
                    startTranslationBtn.textContent = '✅ Oversættelse fuldført';
                    startTranslationBtn.style.backgroundColor = '#28a745';
                    startTranslationBtn.style.color = 'white';
                }
                
                this.showToast(`Oversættelse fuldført! ${result.translated_count} rækker oversat`, 'success');
                
                // Show errors if any
                if (result.errors && result.errors.length > 0) {
                    console.warn('Translation errors:', result.errors);
                    this.showToast(`${result.errors.length} fejl opstod under oversættelse`, 'warning');
                }
                
            } else {
                throw new Error(result.error || 'Oversættelse fejlede');
            }
            
        } catch (error) {
            console.error('❌ Translation error:', error);
            
            // Clear animation interval
            if (this.progressAnimationInterval) {
                clearInterval(this.progressAnimationInterval);
            }
            
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="translation-error" style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 10px 0;">
                        <h4 style="color: #721c24; margin: 0 0 10px 0;">❌ Oversættelsesfejl</h4>
                        <div style="color: #721c24;">${error.message}</div>
                    </div>
                `;
            }
            
            this.showToast(`Oversættelsesfejl: ${error.message}`, 'error');
            
        } finally {
            // Reset translation flag
            this.isTranslating = false;
            
            // Re-enable start button (unless it was successful)
            if (startTranslationBtn && !startTranslationBtn.textContent.includes('fuldført')) {
                startTranslationBtn.disabled = false;
                startTranslationBtn.textContent = 'Start oversættelse';
            }
            
            // Hide progress after delay
            if (progressBar) {
                setTimeout(() => {
                    progressBar.style.display = 'none';
                }, 3000);
            }
        }
    }

    startProgressAnimation(progressBar, statusDiv, startTime) {
        let animationProgress = 0;
        let dots = 0;
        
        this.progressAnimationInterval = setInterval(() => {
            // Animate progress bar gradually (simulate progress)
            if (animationProgress < 90) { // Don't go to 100% until actually complete
                animationProgress += Math.random() * 3; // Random increment
                if (progressBar) {
                    progressBar.querySelector('.progress-fill').style.width = `${Math.min(animationProgress, 90)}%`;
                }
            }
            
            // Update status text with animated dots
            dots = (dots + 1) % 4;
            const dotString = '.'.repeat(dots);
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            
            if (statusDiv) {
                const statusContainer = statusDiv.querySelector('.translation-status-container');
                if (statusContainer) {
                    statusContainer.innerHTML = `
                        <div class="status-text">🔄 Oversætter indhold${dotString}</div>
                        <div class="progress-info">
                            <span class="progress-counter">Arbejder på oversættelse...</span>
                            <span class="time-estimate">Tid forløbet: ${elapsed}s</span>
                        </div>
                    `;
                }
            }
        }, 500); // Update every 500ms
    }

    showTranslationProgress(progressUpdates) {
        const statusDiv = document.getElementById('translation-status');
        if (!statusDiv) return;
        
        // Create progress details container
        const progressDetails = document.createElement('div');
        progressDetails.className = 'translation-progress-details';
        progressDetails.style.maxHeight = '200px';
        progressDetails.style.overflowY = 'auto';
        progressDetails.style.marginTop = '10px';
        progressDetails.style.border = '1px solid #ddd';
        progressDetails.style.borderRadius = '4px';
        progressDetails.style.padding = '10px';
        progressDetails.style.backgroundColor = '#f8f9fa';
        
        progressDetails.innerHTML = '<h5>Oversættelsesdetaljer:</h5>';
        
        progressUpdates.forEach(update => {
            const updateDiv = document.createElement('div');
            updateDiv.style.marginBottom = '8px';
            updateDiv.style.padding = '5px';
            updateDiv.style.borderLeft = `3px solid ${update.status === 'completed' ? '#28a745' : '#dc3545'}`;
            updateDiv.style.backgroundColor = update.status === 'completed' ? '#d4edda' : '#f8d7da';
            
            updateDiv.innerHTML = `
                <strong>${update.locale.toUpperCase()}</strong> - ${update.progress}
                <br><small style="color: #666;">
                    ${update.original_text}
                </small>
                <br><small style="color: ${update.status === 'completed' ? '#155724' : '#721c24'};">
                    → ${update.translated_text}
                </small>
            `;
            
            progressDetails.appendChild(updateDiv);
        });
        
        statusDiv.appendChild(progressDetails);
    }
    
    showEditPreviewButton() {
        const statusDiv = document.getElementById('translation-status');
        if (!statusDiv) return;
        
        // Create edit preview button
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-secondary';
        editButton.style.marginTop = '10px';
        editButton.style.marginRight = '10px';
        editButton.textContent = '✏️ Rediger oversættelser';
        editButton.onclick = () => this.showTranslationPreview();
        
        statusDiv.appendChild(editButton);
    }
    
    async showTranslationPreview() {
        try {
            const response = await fetch('/api/csv-preview');
            const result = await response.json();
            
            if (result.csv_data) {
                this.displayTranslationEditor(result.csv_data);
            } else {
                throw new Error(result.error || 'Kunne ikke hente CSV data');
            }
        } catch (error) {
            console.error('Error loading CSV preview:', error);
            this.showToast(`Fejl ved hentning af preview: ${error.message}`, 'error');
        }
    }
    
    displayTranslationEditor(csvData) {
        console.log('🎯 Opening translation editor with data:', {
            dataType: typeof csvData,
            isArray: Array.isArray(csvData),
            length: csvData ? csvData.length : 'undefined',
            firstRow: csvData && csvData[0] ? csvData[0] : 'undefined'
        });
        
        if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
            console.error('❌ Invalid CSV data for editor:', csvData);
            this.showToast('Ugyldig CSV data - kan ikke åbne editor', 'error');
            return;
        }
        
        // Create FULL-SCREEN editor (not Bootstrap modal)
        const fullScreenEditor = document.createElement('div');
        fullScreenEditor.id = 'translation-full-screen-editor';
        fullScreenEditor.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: white;
            z-index: 9999;
            display: flex;
            flex-direction: column;
        `;
        
        console.log('✅ Full-screen editor element created');
        
        fullScreenEditor.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
                    <div class="modal-header" style="flex-shrink: 0; border-bottom: 2px solid #dee2e6; background: #343a40; color: white; padding: 10px 15px;">
                        <h5 class="modal-title mb-0" style="color: white;">
                            <i class="fas fa-table"></i> <strong>Rediger oversættelser</strong>
                            <small class="text-light ml-2">(${csvData.length} rækker)</small>
                        </h5>
                        <div class="d-flex align-items-center">
                            <div class="input-group mr-3" style="width: 300px;">
                                <div class="input-group-prepend">
                                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                                </div>
                                <input type="text" class="form-control" placeholder="Søg i alt indhold..." 
                                    id="translation-search" onkeyup="seoGenerator.filterTranslationRows(this.value)">
                            </div>
                            <div class="btn-group mr-3">
                                <button class="btn btn-outline-secondary btn-sm" onclick="seoGenerator.adjustColumnSize('compact')" title="Kompakt visning">
                                    <i class="fas fa-compress-alt"></i> Kompakt
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" onclick="seoGenerator.adjustColumnSize('comfortable')" title="Komfortabel visning">
                                    <i class="fas fa-expand-alt"></i> Komfortabel  
                                </button>
                            </div>
                            <div class="btn-group mr-3">
                                <button class="btn btn-outline-info btn-sm" onclick="seoGenerator.showOnlyLongTexts()" title="Vis kun lange tekster (body_html)">
                                    <i class="fas fa-filter"></i> Kun lange tekster
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="seoGenerator.showAllRows()" title="Vis alle rækker">
                                    <i class="fas fa-eye"></i> Vis alle
                                </button>
                            </div>
                            <button type="button" class="close" onclick="seoGenerator.closeTranslationEditor(this)" style="font-size: 1.8rem; margin-left: 15px;">
                                <span>&times;</span>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body" style="flex: 1; overflow: hidden; padding: 0; background: #ffffff;">
                        <div id="translation-spreadsheet" style="height: 100%; overflow: auto; position: relative;">
                            <table class="table table-bordered table-hover mb-0" style="font-size: 12px; min-width: 100%;" id="translation-table">
                                <thead style="position: sticky; top: 0; background: #343a40; color: white; z-index: 100; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                    <tr>
                                        <th style="width: 50px; text-align: center; padding: 12px 8px; font-weight: bold; border-right: 2px solid #495057;">#</th>
                                        <th style="width: 80px; text-align: center; padding: 12px 8px; font-weight: bold; border-right: 1px solid #495057;">
                                            <i class="fas fa-language"></i><br>Locale
                                        </th>
                                        <th style="width: 100px; text-align: center; padding: 12px 8px; font-weight: bold; border-right: 1px solid #495057;">
                                            <i class="fas fa-tag"></i><br>Type
                                        </th>
                                        <th style="width: 120px; text-align: center; padding: 12px 8px; font-weight: bold; border-right: 1px solid #495057;">
                                            <i class="fas fa-field"></i><br>Field
                                        </th>
                                        <th style="min-width: 400px; text-align: center; padding: 12px 8px; font-weight: bold; border-right: 2px solid #495057; background: #495057;">
                                            <i class="fas fa-file-alt"></i><br><strong>ORIGINAL CONTENT</strong><br>
                                            <small style="opacity: 0.8;">(Danish - read-only)</small>
                                        </th>
                                        <th style="min-width: 450px; text-align: center; padding: 12px 8px; font-weight: bold; border-right: 2px solid #495057; background: #28a745; color: white;">
                                            <i class="fas fa-edit"></i><br><strong>TRANSLATION</strong><br>
                                            <small style="opacity: 0.9;">(Target Language - EDITABLE)</small>
                                        </th>
                                        <th style="width: 120px; text-align: center; padding: 12px 8px; font-weight: bold;">
                                            <i class="fas fa-save"></i><br>Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="translation-table-body">
                                    ${csvData.map((row, index) => this.createExcelTranslationRow(row, index)).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer" style="flex-shrink: 0; border-top: 2px solid #dee2e6; background: #343a40; color: white; padding: 10px 15px;">
                        <div class="w-100 d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge badge-info badge-lg mr-2">
                                    <i class="fas fa-list"></i> Total: ${csvData.length} rækker
                                </span>
                                <span class="badge badge-warning badge-lg mr-2" id="changed-count">
                                    <i class="fas fa-edit"></i> 0 ændringer
                                </span>
                                <span class="badge badge-success badge-lg" id="visible-count">
                                    <i class="fas fa-eye"></i> ${csvData.length} synlige
                                </span>
                            </div>
                            <div>
                                <button type="button" class="btn btn-outline-secondary btn-lg mr-3" onclick="seoGenerator.closeTranslationEditor(this)">
                                    <i class="fas fa-times"></i> Luk uden at gemme
                                </button>
                                <button type="button" class="btn btn-success btn-lg" onclick="seoGenerator.saveAllTranslationEdits()" id="save-all-btn">
                                    <i class="fas fa-save"></i> Gem alle ændringer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Prevent body scrolling when full-screen editor is open
        document.body.style.overflow = 'hidden';
        
        console.log('📝 Adding full-screen editor to DOM...');
        document.body.appendChild(fullScreenEditor);
        console.log('✅ Editor added to DOM successfully');
        
        // Add advanced CSS for Excel-like experience
        this.addExcelStyleCSS();
        
        // Store reference for later use
        this.currentTranslationModal = fullScreenEditor;
        this.currentCsvData = csvData;
        
        // Initialize Excel-like functionality
        this.initializeExcelFeatures();
        
        console.log('🎉 Translation editor fully initialized and should be visible!');
    }
    
    createExcelTranslationRow(row, index) {
        const locale = row.locale || '';
        const originalContent = row['default content'] || '';
        const translatedContent = row['translated content'] || '';
        const type = row['type'] || '';
        const field = row['field'] || '';
        
        // Check if this is a long text (likely body_html)
        const isLongText = originalContent.length > 300;
        const isHtmlContent = originalContent.includes('<') && originalContent.includes('>');
        
        return `
            <tr class="translation-row" data-row-index="${index}" data-is-long="${isLongText}" style="border-bottom: 1px solid #dee2e6;">
                <td class="row-number" style="text-align: center; font-weight: bold; background: #f8f9fa; position: sticky; left: 0; z-index: 10; border-right: 2px solid #dee2e6;">
                    ${index + 1}
                </td>
                <td style="text-align: center; padding: 8px; vertical-align: middle;">
                    <span class="badge ${this.getLocaleBadgeClass(locale)}">${locale.toUpperCase()}</span>
                </td>
                <td style="text-align: center; padding: 8px; vertical-align: middle;">
                    <span class="badge badge-secondary" style="font-size: 10px;">${type}</span>
                </td>
                <td style="padding: 8px; vertical-align: middle; font-size: 11px; font-weight: 500;">
                    ${field}
                </td>
                <td class="original-content-cell" style="padding: 8px; vertical-align: top; border-right: 2px solid #dee2e6; background: #f9f9f9;">
                    <div class="content-display ${isHtmlContent ? 'html-content' : ''}" 
                         data-original-content="${originalContent.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"
                         style="max-height: 150px; overflow-y: auto; font-size: 11px; line-height: 1.4; 
                                font-family: ${isHtmlContent ? 'inherit' : 'inherit'}; 
                                white-space: ${isHtmlContent ? 'normal' : 'pre-wrap'}; word-wrap: break-word; border: 1px solid #e9ecef; 
                                border-radius: 4px; padding: 8px; background: white;">
                        ${this.formatContentForDisplay(originalContent)}
                    </div>

                </td>
                <td class="translation-content-cell" style="padding: 8px; vertical-align: top; border-right: 2px solid #dee2e6;">
                    <div class="translation-preview" style="margin-bottom: 8px; ${translatedContent ? '' : 'display: none;'}">
                        <div class="content-display ${isHtmlContent ? 'html-content' : ''}" 
                             style="max-height: 150px; overflow-y: auto; font-size: 11px; line-height: 1.4; 
                                    white-space: ${isHtmlContent ? 'normal' : 'pre-wrap'}; word-wrap: break-word; border: 1px solid #e9ecef; 
                                    border-radius: 4px; padding: 8px; background: white; position: relative;">
                            ${this.formatContentForDisplay(translatedContent)}

                        </div>
                    </div>
                    <textarea class="translation-textarea" 
                              data-row-index="${index}"
                              placeholder="Indtast oversættelse her..."
                              style="width: 100%; min-height: ${this.getTextareaHeight(originalContent)}px; 
                                     border: 1px solid #ced4da; border-radius: 4px; padding: 8px; 
                                     font-size: 11px; line-height: 1.4; resize: vertical; 
                                     font-family: ${isHtmlContent ? 'monospace' : 'inherit'};
                                     transition: border-color 0.2s ease, box-shadow 0.2s ease;
                                     ${translatedContent && isHtmlContent ? 'display: none;' : ''}"
                              oninput="seoGenerator.markTranslationChanged(this); seoGenerator.updateTranslationPreview(this, ${index})"
                              onfocus="this.style.borderColor='#007bff'; this.style.boxShadow='0 0 0 0.2rem rgba(0,123,255,.25)'"
                              onblur="this.style.borderColor='#ced4da'; this.style.boxShadow='none';">${translatedContent}</textarea>
                    <div class="mt-2 d-flex justify-content-end" style="font-size: 10px;">
                        <div>
                            <button class="btn btn-outline-secondary btn-xs mr-1" onclick="seoGenerator.expandTextarea(${index})" title="Udvid/skjul">
                                <i class="fas fa-expand-arrows-alt"></i>
                            </button>
                            <button class="btn btn-outline-info btn-xs" onclick="seoGenerator.copyOriginalToTranslation(${index})" title="Kopier original">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </td>
                <td style="text-align: center; padding: 8px; vertical-align: middle;">
                    <div class="d-flex flex-column" style="gap: 4px;">
                        <button class="btn btn-primary btn-sm save-btn" 
                                onclick="seoGenerator.saveTranslationEdit(${index})" 
                                title="Gem denne oversættelse">
                            <i class="fas fa-save"></i>
                        </button>
                        <button class="btn btn-outline-secondary btn-sm html-toggle-btn" 
                                onclick="seoGenerator.toggleHtmlView(${index})" 
                                title="Skift mellem preview og HTML kode"
                                data-mode="preview">
                            <i class="fas fa-code"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    addExcelStyleCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* Full screen modal overrides */
            .modal {
                padding: 0 !important;
            }
            .modal-backdrop {
                opacity: 1 !important;
                background-color: #000 !important;
            }
            
            /* Excel-like table styles */
            .translation-row {
                transition: background-color 0.2s ease;
            }
            .translation-row:hover {
                background-color: #f1f3f4 !important;
            }
            .translation-row.changed {
                background-color: #fff8e1 !important;
                border-left: 4px solid #ffc107;
            }
            .translation-textarea {
                transition: all 0.2s ease;
            }
            .translation-textarea.changed {
                border-color: #ffc107 !important;
                background-color: #fff8e1;
            }
            .content-display {
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            .content-display:hover {
                background-color: #e9ecef !important;
            }
            .html-content {
                font-family: inherit !important;
                color: #495057;
                background-color: #f8f9fa !important;
            }
            .html-content h1, .html-content h2, .html-content h3, .html-content h4, .html-content h5, .html-content h6 {
                font-weight: bold;
                margin: 8px 0 4px 0;
                color: #2c3e50;
                font-size: inherit;
            }
            .html-content h1 { font-size: 1.1em; }
            .html-content h2 { font-size: 1.05em; }
            .html-content h3 { font-size: 1.02em; }
            .html-content p {
                margin: 4px 0;
                line-height: 1.4;
            }
            .html-content ul, .html-content ol {
                margin: 4px 0;
                padding-left: 16px;
            }
            .html-content li {
                margin: 2px 0;
            }
            .html-content strong, .html-content b {
                font-weight: bold;
            }
            .html-content em, .html-content i {
                font-style: italic;
            }
            .btn-xs {
                padding: 2px 6px;
                font-size: 10px;
                border-radius: 3px;
            }
            .char-count {
                font-family: monospace;
                font-size: 10px;
                color: #6c757d;
            }
            .save-btn.saving {
                background-color: #17a2b8 !important;
                border-color: #17a2b8 !important;
            }
            .save-btn.saved {
                background-color: #28a745 !important;
                border-color: #28a745 !important;
            }
            
            /* Table positioning and layout */
            #translation-table {
                border-collapse: collapse;
                table-layout: fixed;
                width: 100%;
            }
            #translation-table th {
                position: sticky;
                top: 0;
                z-index: 100;
                background: #343a40 !important;
                color: white !important;
            }
            .row-number {
                position: sticky;
                left: 0;
                z-index: 10;
                background: #f8f9fa !important;
                border-right: 2px solid #dee2e6 !important;
            }
            
            /* Scrollbar styling for better UX */
            #translation-spreadsheet::-webkit-scrollbar {
                width: 12px;
                height: 12px;
            }
            #translation-spreadsheet::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 6px;
            }
            #translation-spreadsheet::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 6px;
            }
            #translation-spreadsheet::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
            
            /* Ensure no body scroll when modal is open */
            body.modal-open {
                overflow: hidden !important;
                padding-right: 0 !important;
            }
        `;
        document.head.appendChild(style);
        
        // Add full-screen class to body when modal opens
        document.body.classList.add('modal-open');
    }
    
    initializeExcelFeatures() {
        // Update character counts in real time
        this.updateAllCharCounts();
    }
    
    getLocaleBadgeClass(locale) {
        const classes = {
            'da': 'badge-primary',
            'en': 'badge-success', 
            'de': 'badge-warning',
            'es': 'badge-info',
            'fr': 'badge-secondary',
            'it': 'badge-danger'
        };
        return classes[locale] || 'badge-dark';
    }
    
    formatContentForDisplay(content) {
        if (!content) return '';
        
        // Check if content contains HTML tags
        const isHtmlContent = content.includes('<') && content.includes('>');
        
        if (isHtmlContent) {
            // For HTML content, render it properly with formatting (like before)
            // Remove script tags for security
            let cleanContent = content.replace(/<script[^>]*>.*?<\/script>/gi, '');
            
            // Clean up common HTML issues for better display
            cleanContent = cleanContent
                .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with regular spaces
                .replace(/\s+/g, ' ')     // Normalize whitespace
                .trim();
            
            // Return the HTML content to be rendered (not escaped)
            return cleanContent;
        } else {
            // For non-HTML content, escape it for safe display
            return content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
    }
    
    getTextareaHeight(originalContent) {
        if (!originalContent) return 60;
        
        // Base height calculation on content length and line breaks
        const lines = originalContent.split('\n').length;
        const estimatedLines = Math.max(lines, Math.ceil(originalContent.length / 100));
        
        // Min 60px, max 200px for initial display
        return Math.min(200, Math.max(60, estimatedLines * 20));
    }
    
    filterTranslationRows(searchTerm) {
        const rows = document.querySelectorAll('#translation-table-body .translation-row');
        const term = searchTerm.toLowerCase();
        let visibleCount = 0;
        
        rows.forEach(row => {
            const content = row.textContent.toLowerCase();
            if (!term || content.includes(term)) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update visible count
        const visibleCountElement = document.getElementById('visible-count');
        if (visibleCountElement) {
            visibleCountElement.innerHTML = `<i class="fas fa-eye"></i> ${visibleCount} synlige`;
        }
    }
    
    adjustColumnSize(size) {
        const originalCells = document.querySelectorAll('.original-content-cell');
        const translationCells = document.querySelectorAll('.translation-content-cell');
        
        if (size === 'compact') {
            originalCells.forEach(cell => cell.style.minWidth = '300px');
            translationCells.forEach(cell => cell.style.minWidth = '350px');
        } else {
            originalCells.forEach(cell => cell.style.minWidth = '500px');
            translationCells.forEach(cell => cell.style.minWidth = '550px');
        }
    }
    
    showOnlyLongTexts() {
        const rows = document.querySelectorAll('#translation-table-body .translation-row');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const isLong = row.getAttribute('data-is-long') === 'true';
            if (isLong) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update visible count
        const visibleCountElement = document.getElementById('visible-count');
        if (visibleCountElement) {
            visibleCountElement.innerHTML = `<i class="fas fa-eye"></i> ${visibleCount} synlige (kun lange)`;
        }
    }
    
    showAllRows() {
        const rows = document.querySelectorAll('#translation-table-body .translation-row');
        rows.forEach(row => {
            row.style.display = '';
        });
        
        // Update visible count
        const visibleCountElement = document.getElementById('visible-count');
        if (visibleCountElement) {
            visibleCountElement.innerHTML = `<i class="fas fa-eye"></i> ${rows.length} synlige`;
        }
    }
    
    expandTextarea(rowIndex) {
        const textarea = document.querySelector(`textarea[data-row-index="${rowIndex}"]`);
        if (textarea) {
            const currentHeight = parseInt(textarea.style.minHeight) || 60;
            const newHeight = currentHeight < 200 ? 300 : 60;
            textarea.style.minHeight = newHeight + 'px';
        }
    }
    
    copyOriginalToTranslation(rowIndex) {
        const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
        if (row) {
            const originalDiv = row.querySelector('.content-display');
            const textarea = row.querySelector('textarea');
            
            if (originalDiv && textarea) {
                // Get the original content (decode HTML entities)
                const originalContent = this.currentCsvData[rowIndex]['default content'] || '';
                textarea.value = originalContent;
                this.markTranslationChanged(textarea);
            }
        }
    }
    
    markTranslationChanged(textarea) {
        textarea.classList.add('changed');
        textarea.closest('tr').classList.add('changed');
        
        // Update changed count
        const changedCount = document.querySelectorAll('textarea.changed').length;
        const changedCountElement = document.getElementById('changed-count');
        if (changedCountElement) {
            changedCountElement.innerHTML = `<i class="fas fa-edit"></i> ${changedCount} ændringer`;
        }
    }

    updateTranslationPreview(textarea, rowIndex) {
        const row = textarea.closest('tr');
        const previewDiv = row.querySelector('.translation-preview');
        const contentDisplay = previewDiv.querySelector('.content-display');
        
        if (textarea.value.trim()) {
            previewDiv.style.display = 'block';
            const isHtmlContent = textarea.value.includes('<') && textarea.value.includes('>');
            contentDisplay.innerHTML = this.formatContentForDisplay(textarea.value);
            
            // Add edit button for HTML content
            if (isHtmlContent) {
                const existingButton = contentDisplay.querySelector('.edit-html-btn');
                if (!existingButton) {
                    const editButton = document.createElement('button');
                    editButton.className = 'btn btn-sm btn-outline-primary edit-html-btn';
                    editButton.style.cssText = 'position: absolute; top: 4px; right: 4px; padding: 2px 6px; font-size: 10px;';
                    editButton.innerHTML = '<i class="fas fa-edit"></i>';
                    editButton.title = 'Rediger HTML kode';
                    editButton.onclick = () => {
                        // Show textarea for editing
                        previewDiv.style.display = 'none';
                        textarea.style.display = 'block';
                        textarea.focus();
                    };
                    contentDisplay.appendChild(editButton);
                }
                // Hide textarea when showing HTML preview
                textarea.style.display = 'none';
            } else {
                // Show textarea for non-HTML content
                textarea.style.display = 'block';
            }
        } else {
            previewDiv.style.display = 'none';
            textarea.style.display = 'block';
        }
    }


    
    updateAllCharCounts() {
        // Character counts have been removed to save space
        // This function is kept for compatibility but does nothing
    }

    toggleHtmlView(rowIndex) {
        // Get the table and row elements
        const csvDataElement = document.getElementById('translation-table');
        if (!csvDataElement) {
            this.showToast('Ingen oversættelsesdata fundet', 'error');
            return;
        }

        const tableRows = csvDataElement.querySelectorAll('tbody tr');
        if (rowIndex >= tableRows.length) {
            this.showToast('Ingen data fundet for denne række', 'error');
            return;
        }

        const tableRow = tableRows[rowIndex];
        const toggleButton = tableRow.querySelector('.html-toggle-btn');
        const originalContentDiv = tableRow.querySelector('.original-content-cell .content-display');
        const translationPreview = tableRow.querySelector('.translation-preview');
        const translationTextarea = tableRow.querySelector('.translation-textarea');
        
        if (!toggleButton || !originalContentDiv || !translationTextarea) {
            this.showToast('Kunne ikke finde nødvendige elementer', 'error');
            return;
        }

        const currentMode = toggleButton.dataset.mode || 'preview';
        
        if (currentMode === 'preview') {
            // Switch to HTML mode
            this.showHtmlMode(tableRow, rowIndex, toggleButton);
        } else {
            // Switch back to preview mode
            this.showPreviewMode(tableRow, rowIndex, toggleButton);
        }
    }

    showHtmlMode(tableRow, rowIndex, toggleButton) {
        const originalContentDiv = tableRow.querySelector('.original-content-cell .content-display');
        const translationPreview = tableRow.querySelector('.translation-preview');
        const translationTextarea = tableRow.querySelector('.translation-textarea');
        
        // Get original content
        let originalHtml = '';
        if (originalContentDiv.dataset.originalContent) {
            originalHtml = originalContentDiv.dataset.originalContent;
        } else {
            originalHtml = originalContentDiv.innerHTML || '';
        }
        
        const translatedHtml = translationTextarea.value || '';
        
        // Replace original content with HTML code view
        originalContentDiv.innerHTML = `
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 8px;">
                <small class="text-muted d-block mb-2"><i class="fas fa-code"></i> HTML Kode:</small>
                <pre style="margin: 0; font-size: 10px; max-height: 130px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${originalHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
        `;
        
        // Replace translation preview/textarea with HTML code view
        if (translationPreview) {
            translationPreview.style.display = 'none';
        }
        
        translationTextarea.style.display = 'none';
        
        // Create HTML view for translation
        const existingHtmlView = tableRow.querySelector('.translation-html-view');
        if (existingHtmlView) {
            existingHtmlView.remove();
        }
        
        const htmlViewDiv = document.createElement('div');
        htmlViewDiv.className = 'translation-html-view';
        htmlViewDiv.innerHTML = `
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 8px; min-height: ${this.getTextareaHeight(originalHtml)}px;">
                <small class="text-muted d-block mb-2"><i class="fas fa-code"></i> HTML Kode:</small>
                <pre style="margin: 0; font-size: 10px; max-height: 130px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${translatedHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
        `;
        
        translationTextarea.parentNode.insertBefore(htmlViewDiv, translationTextarea);
        
        // Update button state
        toggleButton.dataset.mode = 'html';
        toggleButton.className = 'btn btn-primary btn-sm html-toggle-btn';
        toggleButton.title = 'Skift til preview mode';
        toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
    }

    showPreviewMode(tableRow, rowIndex, toggleButton) {
        const originalContentDiv = tableRow.querySelector('.original-content-cell .content-display');
        const translationPreview = tableRow.querySelector('.translation-preview');
        const translationTextarea = tableRow.querySelector('.translation-textarea');
        const translationHtmlView = tableRow.querySelector('.translation-html-view');
        
        // Restore original content display
        let originalHtml = '';
        if (originalContentDiv.dataset.originalContent) {
            originalHtml = originalContentDiv.dataset.originalContent;
        }
        
        originalContentDiv.innerHTML = this.formatContentForDisplay(originalHtml);
        
        // Restore translation preview/textarea
        if (translationHtmlView) {
            translationHtmlView.remove();
        }
        
        const translatedContent = translationTextarea.value || '';
        const isHtmlContent = translatedContent.includes('<') && translatedContent.includes('>');
        
        if (translatedContent && isHtmlContent) {
            // Show preview for HTML content
            if (translationPreview) {
                translationPreview.style.display = 'block';
                const previewContentDiv = translationPreview.querySelector('.content-display');
                if (previewContentDiv) {
                    previewContentDiv.innerHTML = this.formatContentForDisplay(translatedContent);
                }
            }
            translationTextarea.style.display = 'none';
        } else {
            // Show textarea for non-HTML content
            if (translationPreview) {
                translationPreview.style.display = 'none';
            }
            translationTextarea.style.display = 'block';
        }
        
        // Update button state
        toggleButton.dataset.mode = 'preview';
        toggleButton.className = 'btn btn-outline-secondary btn-sm html-toggle-btn';
        toggleButton.title = 'Skift mellem preview og HTML kode';
        toggleButton.innerHTML = '<i class="fas fa-code"></i>';
    }


    
    closeTranslationEditor(element) {
        // Restore body scrolling
        document.body.style.overflow = 'auto';
        
        // Remove the full-screen editor
        const fullScreenEditor = document.getElementById('translation-full-screen-editor');
        if (fullScreenEditor) {
            fullScreenEditor.remove();
        }
        
        // Clean up references
        this.currentTranslationModal = null;
        this.currentCsvData = null;
    }
    
    createTranslationCard(row, index) {
        const locale = row.locale || '';
        const originalText = row['default content'] || '';
        const translatedText = row['translated content'] || '';
        const type = row['type'] || '';
        const field = row['field'] || '';
        
        const card = document.createElement('div');
        card.className = 'translation-card';
        card.setAttribute('data-locale', locale);
        card.setAttribute('data-type', this.getContentType(row));
        card.style.cssText = `
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 15px;
            padding: 15px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s;
        `;
        
        // Add hover effect
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        
        card.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="translation-original">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge badge-primary">${locale.toUpperCase()}</span>
                            <small class="text-muted">${type} - ${field}</small>
                        </div>
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 3px solid #6c757d;">
                            <strong>Original:</strong><br>
                            <span style="font-size: 14px; line-height: 1.4;">${this.formatTextForDisplay(originalText)}</span>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="translation-edit-section">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <strong>Oversættelse:</strong>
                            <button class="btn btn-sm btn-outline-success" onclick="seoGenerator.saveTranslationEdit(${index})">
                                💾 Gem
                            </button>
                        </div>
                        <textarea class="form-control translation-edit" 
                                data-row-index="${index}" 
                                rows="${this.getTextareaRows(translatedText)}" 
                                style="resize: vertical; font-size: 14px; line-height: 1.4;"
                                placeholder="Rediger oversættelsen her...">${translatedText}</textarea>
                        <small class="text-muted mt-1 d-block">
                            ${originalText.length} → ${translatedText.length} tegn
                        </small>
                    </div>
                </div>
            </div>
        `;
        
        return card;
    }
    
    getContentType(row) {
        const type = row['type'] || '';
        const field = row['field'] || '';
        const originalText = row['default content'] || '';
        
        if (type.toLowerCase().includes('title') || field.toLowerCase().includes('title') || originalText.length < 100) {
            return 'title';
        } else if (type.toLowerCase().includes('description') || field.toLowerCase().includes('description')) {
            return 'description';
        } else if (type.toLowerCase().includes('url') || field.toLowerCase().includes('url') || originalText.includes('/') || originalText.includes('-')) {
            return 'url';
        } else if (type.toLowerCase().includes('meta') || field.toLowerCase().includes('meta')) {
            return 'meta';
        }
        return 'other';
    }
    
    formatTextForDisplay(text) {
        // Truncate very long text but show more than the old version
        if (text.length > 200) {
            return text.substring(0, 200) + '...';
        }
        // Escape HTML to prevent issues
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    
    getTextareaRows(text) {
        // Dynamic textarea height based on content
        const lines = text.split('\n').length;
        const estimatedLines = Math.ceil(text.length / 80); // Rough estimate
        return Math.max(3, Math.min(8, Math.max(lines, estimatedLines)));
    }
    
    setupLanguageFilter(csvData) {
        const localeFilter = document.getElementById('translation-locale-filter');
        if (!localeFilter) return;
        
        // Get unique locales
        const locales = [...new Set(csvData.map(row => row.locale).filter(locale => locale))];
        
        locales.forEach(locale => {
            const option = document.createElement('option');
            option.value = locale;
            option.textContent = `🌍 ${locale.toUpperCase()}`;
            localeFilter.appendChild(option);
        });
    }
    
    filterTranslations() {
        if (!this.currentCsvData) return;
        
        const searchTerm = document.getElementById('translation-search')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('translation-type-filter')?.value || '';
        const localeFilter = document.getElementById('translation-locale-filter')?.value || '';
        
        const filteredData = this.currentCsvData.filter((row, index) => {
            const originalText = (row['default content'] || '').toLowerCase();
            const translatedText = (row['translated content'] || '').toLowerCase();
            const locale = row.locale || '';
            const contentType = this.getContentType(row);
            
            // Text search
            const matchesSearch = !searchTerm || 
                originalText.includes(searchTerm) || 
                translatedText.includes(searchTerm);
            
            // Type filter
            const matchesType = !typeFilter || contentType === typeFilter;
            
            // Locale filter
            const matchesLocale = !localeFilter || locale === localeFilter;
            
            return matchesSearch && matchesType && matchesLocale && 
                   originalText.trim() && translatedText.trim();
        });
        
        this.populateTranslationCards(filteredData);
    }
    
    async saveTranslationEdit(rowIndex) {
        const textarea = document.querySelector(`textarea[data-row-index="${rowIndex}"]`);
        if (!textarea) return;
        
        const newTranslation = textarea.value.trim();
        
        try {
            const response = await fetch('/api/update-translation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    row_index: rowIndex,
                    translated_content: newTranslation
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Oversættelse opdateret', 'success');
                textarea.style.borderColor = '#28a745';
                setTimeout(() => {
                    textarea.style.borderColor = '';
                }, 2000);
            } else {
                throw new Error(result.error || 'Opdatering fejlede');
            }
        } catch (error) {
            console.error('Error updating translation:', error);
            this.showToast(`Fejl ved opdatering: ${error.message}`, 'error');
        }
    }
    
    async saveAllTranslationEdits() {
        const textareas = document.querySelectorAll('.translation-edit');
        let updateCount = 0;
        
        for (const textarea of textareas) {
            const rowIndex = parseInt(textarea.dataset.rowIndex);
            const newTranslation = textarea.value.trim();
            
            try {
                const response = await fetch('/api/update-translation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        row_index: rowIndex,
                        translated_content: newTranslation
                    })
                });
                
                if (response.ok) {
                    updateCount++;
                }
            } catch (error) {
                console.error('Error updating translation:', error);
            }
        }
        
        this.showToast(`${updateCount} oversættelser opdateret`, 'success');
        
        // Close modal
        if (this.currentTranslationModal) {
            this.currentTranslationModal.remove();
        }
    }

    async downloadTranslatedCSV() {
        console.log('💾 Downloading translated CSV...');
        
        // Prevent duplicate downloads
        if (this.isDownloading) {
            console.log('Download already in progress, ignoring duplicate call');
            return;
        }
        this.isDownloading = true;
        
        try {
            const response = await fetch('/api/download-translated-csv');
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Download fejlede');
            }
            
            // Get the file blob
            const blob = await response.blob();
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'translated.csv';
            
            // Extract filename from header if available
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showToast(`Fil "${filename}" downloadet succesfuldt!`, 'success');
            
        } catch (error) {
            console.error('❌ Download error:', error);
            this.showToast(`Download fejl: ${error.message}`, 'error');
        } finally {
            // Reset download flag
            this.isDownloading = false;
        }
    }

    async performQuickTranslation() {
        const quickTranslateInput = document.getElementById('quick-translate-input');
        const quickTranslateOutput = document.getElementById('quick-translate-output');
        const targetLanguageSelect = document.getElementById('target-language-select');
        const progressSection = document.getElementById('quick-translate-progress');
        const outputCharCount = document.getElementById('output-char-count');
        const quickTranslateBtn = document.getElementById('quick-translate-btn');

        const inputText = quickTranslateInput.value.trim();
        const targetLanguage = targetLanguageSelect.value;

        if (!inputText) {
            this.showToast('Indtast tekst der skal oversættes', 'warning');
            return;
        }

        // Get current profile for API key
        const currentProfile = this.currentProfile;
        if (!currentProfile) {
            this.showToast('Vælg en profil først', 'warning');
            return;
        }

        // Language mapping - same as CSV translator
        const languageNames = {
            'en': 'engelsk',
            'de': 'tysk',
            'fr': 'fransk',
            'es': 'spansk',
            'it': 'italiensk',
            'sv': 'svensk',
            'no': 'norsk',
            'nl': 'hollandsk',
            'fi': 'finsk',
            'pl': 'polsk',
            'pt': 'portugisisk',
            'ru': 'russisk'
        };

        const targetLanguageName = languageNames[targetLanguage] || targetLanguage;

        try {
            // Show progress
            progressSection.style.display = 'block';
            quickTranslateBtn.disabled = true;

            const response = await fetch('/api/quick-translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: inputText,
                    target_language: targetLanguageName,
                    profile_name: currentProfile
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Oversættelse fejlede');
            }

            // Show result
            quickTranslateOutput.value = result.translated_text;
            outputCharCount.textContent = `${result.translated_text.length} tegn`;
            
            // Hide progress
            progressSection.style.display = 'none';

            this.showToast(`Tekst oversat til ${targetLanguageName}!`, 'success');

        } catch (error) {
            console.error('Quick translation error:', error);
            progressSection.style.display = 'none';
            this.showToast(`Oversættelsesfejl: ${error.message}`, 'error');
        } finally {
            quickTranslateBtn.disabled = false;
        }
    }

    extractTitle(text) {
        // Extract title from markdown text
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('# ')) {
                return trimmed.substring(2).trim();
            }
        }
        return 'Untitled';
    }

    convertToWebsiteHTML(text) {
        return text
            // Convert markdown-style headings
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Convert bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Convert italic text
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Convert line breaks to paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '')
            .replace(/<p><br><\/p>/g, '<br>');
    }

    async uploadToShopify() {
        console.log('uploadToShopify function called');
        
        // Prevent duplicate uploads
        if (this.isUploading) {
            console.log('Upload already in progress, ignoring duplicate call');
            return;
        }
        this.isUploading = true;
        
        try {
            // Check if profile is selected
            if (!this.currentProfile) {
                console.log('No profile selected');
                this.showToast('Vælg en profil først', 'error');
                return;
            }
            
            console.log('Current profile:', this.currentProfile);

            // Get title and content from contenteditable fields
            const titleElement = document.getElementById('preview-title');
            const contentElement = document.getElementById('preview-content');
            
            console.log('Title element:', titleElement);
            console.log('Content element:', contentElement);
            
            const title = titleElement ? titleElement.textContent.trim() : '';
            const content = contentElement ? contentElement.innerHTML : '';
            
            console.log('Upload to Shopify - Title:', title);
            console.log('Upload to Shopify - Content length:', content.length);
            console.log('Upload to Shopify - Content preview:', content.substring(0, 100));

            if (!title) {
                this.showToast('Titel er påkrævet for Shopify upload', 'warning');
                return;
            }

            if (!content || content.trim() === '') {
                this.showToast('Ingen indhold at uploade', 'warning');
                return;
            }

            // Get author name
            const author = prompt('Indtast forfatter navn:', 'SEO Generator App');
            if (!author) {
                return;
            }

            this.showLoading();

            try {
                // First, try to upload (this will return blogs if multiple exist)
                const response = await fetch('/api/shopify/upload-blog-post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title,  // Separate title like old code
                        body_html: content,  // Body content only like old code
                        author: author,
                        profile_name: this.currentProfile,  // Include current profile
                        featured_image_url: this.featuredImageUrl || null  // Send featured image if selected
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    if (data.requires_selection) {
                        // Multiple blogs exist, let user choose
                        const blogOptions = data.blogs.map(blog => `${blog.title} (ID: ${blog.id})`);
                        const selectedOption = prompt(
                            'Vælg hvilken blog indlægget skal postes i:\n\n' + 
                            blogOptions.map((option, index) => `${index + 1}. ${option}`).join('\n') +
                            '\n\nIndtast nummer (1-' + blogOptions.length + '):'
                        );

                        if (!selectedOption) {
                            this.showToast('Upload annulleret', 'warning');
                            return;
                        }

                        const selectedIndex = parseInt(selectedOption) - 1;
                        if (selectedIndex < 0 || selectedIndex >= data.blogs.length) {
                            this.showToast('Ugyldigt valg', 'error');
                            return;
                        }

                        const selectedBlog = data.blogs[selectedIndex];

                        // Upload to specific blog
                        const specificResponse = await fetch('/api/shopify/upload-blog-post-to-blog', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: title,
                                body_html: content,
                                author: author,
                                blog_id: selectedBlog.id,
                                profile_name: this.currentProfile,  // Include current profile
                                featured_image_url: this.featuredImageUrl || null
                            })
                        });

                        const specificData = await specificResponse.json();

                        if (specificResponse.ok) {
                            this.showToast(`Blogindlæg "${title}" uploadet til Shopify!`, 'success');
                            if (specificData.admin_url) {
                                const openAdmin = confirm('Upload succesfuld! Vil du åbne blogindlægget i Shopify admin?');
                                if (openAdmin) {
                                    window.open(specificData.admin_url, '_blank');
                                }
                            }
                        } else {
                            throw new Error(specificData.error || 'Upload til specifik blog fejlede');
                        }
                    } else {
                        // Single blog or fallback successful, upload complete
                        this.showToast(`Blogindlæg "${title}" uploadet til Shopify!`, 'success');
                        if (data.admin_url) {
                            const openAdmin = confirm('Upload succesfuld! Vil du åbne blogindlægget i Shopify admin?');
                            if (openAdmin) {
                                window.open(data.admin_url, '_blank');
                            }
                        }
                    }
                } else {
                    throw new Error(data.error || 'Shopify upload fejlede');
                }
            } catch (error) {
                console.error('Upload error:', error);
                this.showToast('Fejl ved Shopify upload: ' + error.message, 'error');
            } finally {
                this.hideLoading();
            }
        } finally {
            this.isUploading = false;
        }
    }

    async editProduct(index) {
        if (!this.currentProfile) {
            this.showToast('Ingen profil valgt', 'warning');
            return;
        }

        if (!this.products || index >= this.products.length) {
            this.showToast('Produkt ikke fundet', 'error');
            return;
        }
        
        // Use the new modal for editing
        this.showProductModal(index);
    }

    async deleteProduct(index) {
        if (!this.currentProfile) {
            this.showToast('Ingen profil valgt', 'warning');
            return;
        }

        if (!this.products || index >= this.products.length) {
            this.showToast('Produkt ikke fundet', 'error');
            return;
        }
        
        const product = this.products[index];
        if (!confirm(`Er du sikker på at du vil slette "${product.name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/profiles/${encodeURIComponent(this.currentProfile)}/products/${index}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showToast('Produkt slettet!', 'success');
                this.loadProducts();
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete product');
            }
        } catch (error) {
            this.showToast('Fejl ved sletning af produkt: ' + error.message, 'error');
        }
    }

    // Image handling methods
    showImageModal() {
        this.selectedImage = null;
        this.shopifyImages = [];
        this.showModal('image-modal');
        this.showImageTab('upload');
        this.resetImageForm();
    }

    showImageTab(tabName) {
        // Hide all image tab contents
        document.querySelectorAll('.image-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.image-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab content
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Add active class to selected tab button
        const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabBtn) {
            tabBtn.classList.add('active');
        }
        
        // Load Shopify images if switching to Shopify tab
        if (tabName === 'shopify') {
            this.loadShopifyImages();
        }
    }

    resetImageForm() {
        document.getElementById('image-alt-text').value = '';
        document.getElementById('image-width').value = '';
        document.getElementById('image-height').value = '';
        document.getElementById('upload-preview').style.display = 'none';
        document.getElementById('insert-selected-image-btn').disabled = true;
        this.selectedImage = null;
    }

    async handleImageUpload(file) {
        if (!file) return;
        
        try {
            this.showLoading();
            
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.selectedImage = {
                    type: 'upload',
                    data_url: result.data_url,
                    filename: result.filename,
                    size: result.size,
                    mime_type: result.mime_type
                };
                
                this.showUploadPreview(result);
                document.getElementById('insert-selected-image-btn').disabled = false;
                this.showToast('Billede uploadet succesfuldt', 'success');
            } else {
                this.showToast(result.error || 'Fejl ved upload af billede', 'error');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            this.showToast('Fejl ved upload af billede', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showUploadPreview(imageData) {
        const preview = document.getElementById('upload-preview');
        const img = document.getElementById('upload-preview-img');
        const filename = document.getElementById('upload-filename');
        const size = document.getElementById('upload-size');
        
        img.src = imageData.data_url;
        filename.textContent = imageData.filename;
        size.textContent = `${Math.round(imageData.size / 1024)} KB`;
        
        preview.style.display = 'flex';
    }

    async loadShopifyImages() {
        if (!this.currentProfile) {
            this.showToast('Vælg en profil først', 'error');
            return;
        }
        
        try {
            const grid = document.getElementById('shopify-images-grid');
            grid.innerHTML = '<p class="placeholder">Indlæser Shopify billeder...</p>';
            grid.classList.add('loading');
            
            const response = await fetch(`/api/shopify/product-images?profile_name=${encodeURIComponent(this.currentProfile)}`);
            const result = await response.json();
            
            if (response.ok) {
                this.shopifyImages = result.images || [];
                
                // Show cache status
                const cacheStatus = result.source === 'cache' ? 
                    `<div class="cache-status">📁 Viser ${result.total || this.shopifyImages.length} billeder fra cache</div>` :
                    `<div class="cache-status">🌐 Hentet ${result.total || this.shopifyImages.length} billeder fra Shopify API</div>`;
                
                const statusDiv = document.createElement('div');
                statusDiv.innerHTML = cacheStatus;
                statusDiv.className = 'cache-info';
                grid.appendChild(statusDiv);
                
                this.displayShopifyImages(this.shopifyImages);
            } else {
                if (response.status === 403 && result.details) {
                    grid.innerHTML = `
                        <div class="error-message">
                            <h3>🔒 ${result.error}</h3>
                            <p><strong>Problem:</strong> ${result.details}</p>
                            <p><strong>Løsning:</strong> ${result.solution}</p>
                            <div class="error-actions">
                                <button onclick="window.open('https://admin.shopify.com/store/noyer/settings/apps/private', '_blank')" class="btn-primary">
                                    🔧 Åbn Shopify App Indstillinger
                                </button>
                                <button onclick="app.loadShopifyImages()" class="btn-secondary">
                                    🔄 Prøv Igen
                                </button>
                            </div>
                        </div>
                    `;
                } else {
                    grid.innerHTML = `<p class="placeholder">Fejl: ${result.error}</p>`;
                }
            }
        } catch (error) {
            console.error('Error loading Shopify images:', error);
            const grid = document.getElementById('shopify-images-grid');
            grid.innerHTML = '<p class="placeholder">Fejl ved indlæsning af billeder</p>';
        } finally {
            const grid = document.getElementById('shopify-images-grid');
            grid.classList.remove('loading');
        }
    }

    displayShopifyImages(images) {
        const grid = document.getElementById('shopify-images-grid');
        
        if (!images || images.length === 0) {
            grid.innerHTML = '<p class="placeholder">Ingen billeder fundet</p>';
            return;
        }
        
        grid.innerHTML = '';
        
        images.forEach(image => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.dataset.imageId = image.id;
            
            imageItem.innerHTML = `
                <img src="${image.src}" alt="${image.alt || ''}" loading="lazy">
                <div class="image-item-info">
                    <div class="image-item-title">${image.product_title || 'Ukendt produkt'}</div>
                    <div class="image-item-alt">${image.alt || 'Ingen alt tekst'}</div>
                    <div class="image-item-dimensions">${image.width || '?'} × ${image.height || '?'} px</div>
                </div>
            `;
            
            imageItem.addEventListener('click', () => {
                this.selectShopifyImage(image, imageItem);
            });
            
            grid.appendChild(imageItem);
        });
    }

    selectShopifyImage(image, element) {
        // Remove selection from other images
        document.querySelectorAll('.image-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select this image
        element.classList.add('selected');
        
        this.selectedImage = {
            type: 'shopify',
            src: image.src,
            alt: image.alt || '',
            width: image.width,
            height: image.height,
            product_title: image.product_title
        };
        
        // Pre-fill alt text if available
        document.getElementById('image-alt-text').value = image.alt || image.product_title || '';
        
        document.getElementById('insert-selected-image-btn').disabled = false;
    }

    filterShopifyImages(query) {
        if (!this.shopifyImages) return;
        
        const filtered = this.shopifyImages.filter(image => {
            const searchText = `${image.product_title || ''} ${image.alt || ''}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });
        
        this.displayShopifyImages(filtered);
    }

    async insertSelectedImage() {
        if (!this.selectedImage) {
            this.showToast('Vælg et billede først', 'error');
            return;
        }
        
        try {
            const altText = document.getElementById('image-alt-text').value.trim();
            const width = document.getElementById('image-width').value.trim();
            const height = document.getElementById('image-height').value.trim();
            
            let imageUrl;
            if (this.selectedImage.type === 'upload') {
                imageUrl = this.selectedImage.data_url;
            } else {
                imageUrl = this.selectedImage.src;
            }
            
            const response = await fetch('/api/insert-image-html', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_url: imageUrl,
                    alt_text: altText,
                    width: width || null,
                    height: height || null
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Store the selected image as featured image for Shopify upload instead of inserting in text
                this.featuredImageUrl = imageUrl;
                this.featuredImageAlt = altText;
                
                // Show the featured image indicator
                this.showFeaturedImageIndicator(this.selectedImage.product_title || altText || 'Shopify billede');
                
                // Show confirmation that featured image is set
                this.hideModal('image-modal');
                this.showToast(`Hovedbillede valgt: ${this.selectedImage.product_title || 'Shopify billede'}`, 'success');
            } else {
                this.showToast(result.error || 'Fejl ved indsættelse af billede', 'error');
            }
        } catch (error) {
            console.error('Error inserting image:', error);
            this.showToast('Fejl ved indsættelse af billede', 'error');
        }
    }

    async testShopifyConnection() {
        if (!this.currentProfile) {
            this.showToast('Vælg en profil først', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            const response = await fetch('/api/shopify/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    profile_name: this.currentProfile
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showToast(`Forbindelse til ${result.shop_name} (${result.domain}) lykkedes!`, 'success');
            } else {
                this.showToast(result.error || 'Fejl ved test af Shopify forbindelse', 'error');
            }
        } catch (error) {
            console.error('Error testing Shopify connection:', error);
            this.showToast('Fejl ved test af Shopify forbindelse', 'error');
        } finally {
            this.hideLoading();
        }
    }

    browseShopifyImages() {
        if (!this.currentProfile) {
            this.showToast('Vælg en profil først', 'error');
            return;
        }
        
        this.showImageModal();
        this.showImageTab('shopify');
        
        // Load Shopify images immediately
        this.loadShopifyImages();
    }



    loadProfiles() {
        this.showLoadingIndicator(true);
        fetch('/api/profiles')
            .then(response => response.json())
            .then(data => {
                this.profiles = data.profiles || {};
                this.currentProfile = data.current_profile;
                this.updateProfilesList();
                this.showLoadingIndicator(false);
            })
            .catch(error => {
                console.error('Error loading profiles:', error);
                this.showToast('Fejl ved indlæsning af profiler', 'error');
                this.showLoadingIndicator(false);
            });
    }

    showLoadingIndicator(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (show) {
            loadingOverlay.style.display = 'flex';
        } else {
            loadingOverlay.style.display = 'none';
        }
    }

    showFeaturedImageIndicator(title) {
        const indicator = document.getElementById('featured-image-indicator');
        const titleElement = document.getElementById('featured-image-title');
        
        if (indicator && titleElement) {
            titleElement.textContent = title;
            indicator.style.display = 'flex';
            
            // Add clear button functionality if not already added
            const clearBtn = document.getElementById('clear-featured-image-btn');
            if (clearBtn && !clearBtn.onclick) {
                clearBtn.onclick = () => this.clearFeaturedImage();
            }
        }
    }

    clearFeaturedImage() {
        this.featuredImageUrl = null;
        this.featuredImageAlt = null;
        this.selectedImage = null;
        
        const indicator = document.getElementById('featured-image-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
        
        this.showToast('Hovedbillede fjernet', 'success');
    }

    initBatchGeneration() {
        const batchGenerateBtn = document.getElementById('batch-generate-btn');
        const saveSelectedBtn = document.getElementById('save-selected-btn');
        const clearBatchBtn = document.getElementById('clear-batch-btn');

        if (batchGenerateBtn) {
            batchGenerateBtn.addEventListener('click', () => {
                this.handleBatchGenerate();
            });
        }

        if (saveSelectedBtn) {
            saveSelectedBtn.addEventListener('click', () => {
                this.saveSelectedBatchItems();
            });
        }

        if (clearBatchBtn) {
            clearBatchBtn.addEventListener('click', () => {
                this.clearBatchResults();
            });
        }
    }

    async handleBatchGenerate() {
        const keywords = document.getElementById('keywords')?.value?.trim();
        const batchCount = document.getElementById('batch-count')?.value || 3;
        const selectedProfile = this.currentProfile;

        if (!keywords) {
            this.showToast('Indtast venligst keywords for at generere batch', 'warning');
            return;
        }

        if (!selectedProfile) {
            this.showToast('Vælg venligst en profil først', 'warning');
            return;
        }

        this.setBatchGenerateLoading(true);

        try {
            // Collect all form data like regular generation
            const formData = {
                keywords: keywords,
                batch_count: parseInt(batchCount),
                profile: selectedProfile,
                secondary_keywords: document.getElementById('secondary-keywords')?.value?.trim() || '',
                lsi_keywords: document.getElementById('lsi-keywords')?.value?.trim() || '',
                target_audience: document.getElementById('target-audience')?.value || 'Alle',
                content_purpose: document.getElementById('content-purpose')?.value || 'Information',
                content_type: document.getElementById('content-type')?.value || 'Blog Post',
                text_length: parseInt(document.getElementById('text-length')?.value || 500),
                custom_instructions: document.getElementById('custom-instructions')?.value?.trim() || ''
            };

            console.log('Batch generation request:', formData);

            const response = await fetch('/api/batch-generate-seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Batch generation failed');
            }

            if (data.success) {
                this.displayBatchResults(data.variations);
                this.showToast(`🎉 ${data.total} variationer genereret succesfuldt!`, 'success');
            } else {
                throw new Error(data.error || 'Batch generation failed');
            }

        } catch (error) {
            console.error('Batch generation error:', error);
            this.showToast(`Fejl ved batch generering: ${error.message}`, 'error');
        } finally {
            this.setBatchGenerateLoading(false);
        }
    }

    setBatchGenerateLoading(loading) {
        const btn = document.getElementById('batch-generate-btn');
        if (btn) {
            if (loading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }
    }

    displayBatchResults(variations) {
        // Store variations globally for easy access
        this.currentBatchVariations = variations;
        this.currentVariationIndex = 0;

        // Display first variation in main preview immediately
        if (variations.length > 0) {
            this.displayVariationInPreview(variations[0], 0);
        }

        // Show variation selector if multiple variations
        if (variations.length > 1) {
            this.showVariationSelector(variations);
        }

        // Auto-save the first variation
        if (variations.length > 0) {
            this.autoSaveGeneratedContent({
                text: variations[0].content,
                html: variations[0].html_content,
                title: variations[0].title,
                keywords: variations[0].keywords
            });
        }

        this.showToast(`🎉 ${variations.length} variationer genereret - brug pilene til at gennemse dem`, 'success');
    }

    displayVariationInPreview(variation, index) {
        // Update main preview with this variation
        const previewContent = document.getElementById('preview-content');
        const previewTitle = document.getElementById('preview-title');

        if (previewContent) {
            previewContent.innerHTML = variation.html_content;
        }

        if (previewTitle) {
            previewTitle.textContent = variation.title || 'Forhåndsvisning';
        }

        // Update generated texts list with all variations
        this.addVariationsToGeneratedTexts(this.currentBatchVariations);

        // Scroll to preview
        const previewContainer = document.getElementById('preview-container');
        if (previewContainer) {
            previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    showVariationSelector(variations) {
        // Create variation navigation in the preview area
        const previewContainer = document.getElementById('preview-container');
        if (!previewContainer) return;

        // Remove existing variation nav if present
        const existingNav = previewContainer.querySelector('.variation-nav');
        if (existingNav) {
            existingNav.remove();
        }

        const variationNav = document.createElement('div');
        variationNav.className = 'variation-nav';
        variationNav.style.cssText = `
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        `;

        variationNav.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <span style="font-weight: 600; color: #495057;">
                    📝 Variation <span id="current-variation-number">1</span> af ${variations.length}:
                    <span id="current-variation-name" style="color: #007bff;">${variations[0].name}</span>
                </span>
                <div style="display: flex; gap: 8px;">
                    <button id="prev-variation" class="btn btn-outline-secondary btn-sm" style="padding: 5px 12px;" ${variations.length <= 1 ? 'disabled' : ''}>
                        ← Forrige
                    </button>
                    <button id="next-variation" class="btn btn-outline-secondary btn-sm" style="padding: 5px 12px;" ${variations.length <= 1 ? 'disabled' : ''}>
                        Næste →
                    </button>
                </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button id="save-current-variation" class="btn btn-success btn-sm" style="padding: 5px 12px;">
                    💾 Gem denne variation
                </button>
                <button id="save-all-variations" class="btn btn-info btn-sm" style="padding: 5px 12px;">
                    📚 Gem alle variationer
                </button>
            </div>
        `;

        // Insert at the top of preview container
        previewContainer.insertBefore(variationNav, previewContainer.firstChild);

        // Add event listeners
        this.setupVariationNavigation();
    }

    setupVariationNavigation() {
        const prevBtn = document.getElementById('prev-variation');
        const nextBtn = document.getElementById('next-variation');
        const saveCurrent = document.getElementById('save-current-variation');
        const saveAll = document.getElementById('save-all-variations');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.showPreviousVariation());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.showNextVariation());
        }

        if (saveCurrent) {
            saveCurrent.addEventListener('click', () => this.saveCurrentVariation());
        }

        if (saveAll) {
            saveAll.addEventListener('click', () => this.saveAllVariations());
        }
    }

    showPreviousVariation() {
        if (!this.currentBatchVariations || this.currentVariationIndex <= 0) return;

        this.currentVariationIndex--;
        this.displayVariationInPreview(this.currentBatchVariations[this.currentVariationIndex], this.currentVariationIndex);
        this.updateVariationNavDisplay();
    }

    showNextVariation() {
        if (!this.currentBatchVariations || this.currentVariationIndex >= this.currentBatchVariations.length - 1) return;

        this.currentVariationIndex++;
        this.displayVariationInPreview(this.currentBatchVariations[this.currentVariationIndex], this.currentVariationIndex);
        this.updateVariationNavDisplay();
    }

    updateVariationNavDisplay() {
        const currentNumber = document.getElementById('current-variation-number');
        const currentName = document.getElementById('current-variation-name');
        const prevBtn = document.getElementById('prev-variation');
        const nextBtn = document.getElementById('next-variation');

        if (currentNumber) {
            currentNumber.textContent = this.currentVariationIndex + 1;
        }

        if (currentName && this.currentBatchVariations) {
            currentName.textContent = this.currentBatchVariations[this.currentVariationIndex].name;
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentVariationIndex <= 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentVariationIndex >= this.currentBatchVariations.length - 1;
        }
    }

    async saveCurrentVariation() {
        if (!this.currentBatchVariations || this.currentVariationIndex < 0) {
            this.showToast('Ingen variation at gemme', 'error');
            return;
        }

        const variation = this.currentBatchVariations[this.currentVariationIndex];
        const variationName = `${variation.keywords} - ${variation.name}`;

        try {
            await this.saveTextData(variationName, variation.content, variation.title, '', variation.keywords);
            this.showToast(`✅ "${variation.name}" gemt succesfuldt!`, 'success');
        } catch (error) {
            this.showToast(`Fejl ved gem: ${error.message}`, 'error');
        }
    }

    async saveAllVariations() {
        if (!this.currentBatchVariations || this.currentBatchVariations.length === 0) {
            this.showToast('Ingen variationer at gemme', 'error');
            return;
        }

        const saveBtn = document.getElementById('save-all-variations');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Gemmer...';
        saveBtn.disabled = true;

        try {
            let savedCount = 0;
            
            for (const variation of this.currentBatchVariations) {
                const variationName = `${variation.keywords} - ${variation.name}`;
                
                try {
                    await this.saveTextData(variationName, variation.content, variation.title, '', variation.keywords);
                    savedCount++;
                } catch (error) {
                    console.error(`Error saving variation ${variation.name}:`, error);
                }
            }

            if (savedCount === this.currentBatchVariations.length) {
                this.showToast(`🎉 Alle ${savedCount} variationer gemt succesfuldt!`, 'success');
            } else {
                this.showToast(`⚠️ ${savedCount} af ${this.currentBatchVariations.length} variationer gemt`, 'warning');
            }

        } catch (error) {
            this.showToast(`Fejl ved gem af variationer: ${error.message}`, 'error');
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    addVariationsToGeneratedTexts(variations) {
        // Add all variations to the generated texts list
        variations.forEach((variation, index) => {
            this.addToGeneratedTexts({
                text: variation.content,
                html: variation.html_content,
                title: variation.title,
                keywords: variation.keywords,
                name: `${variation.name} (${index + 1}/${variations.length})`
            });
        });
    }

    async saveTextData(name, content, title, metaDescription, keywords) {
        try {
            const response = await fetch('/api/save-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    content: content,
                    title: title,
                    meta_description: metaDescription,
                    keywords: keywords
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save text');
            }

            // Refresh saved texts list
            await this.loadSavedTexts();

            return data;
        } catch (error) {
            console.error('Save text error:', error);
            throw error;
        }
    }

    // Legacy function - kept for compatibility
    updateSaveSelectedButton() {
        // This function is no longer used with the new variation preview system
        console.log('updateSaveSelectedButton called - using new variation system instead');
    }

    async saveSelectedBatchItems() {
        const checkedBoxes = document.querySelectorAll('.batch-checkbox:checked');
        
        if (checkedBoxes.length === 0) {
            this.showToast('Vælg venligst mindst én tekst at gemme', 'warning');
            return;
        }

        const saveBtn = document.getElementById('save-selected-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Gemmer...';
        saveBtn.disabled = true;

        try {
            let savedCount = 0;
            let errors = [];

            for (const checkbox of checkedBoxes) {
                const batchItem = checkbox.closest('.batch-item');
                const variation = batchItem.variationData;

                if (!variation) {
                    errors.push(`Kunne ikke gemme variation ${checkbox.id}`);
                    continue;
                }

                try {
                    // Generate unique name for this variation
                    const baseName = `${variation.keywords} - ${variation.name}`;
                    let textName = baseName;
                    let counter = 1;

                    // Check if name already exists and modify if needed
                    while (this.savedTexts && this.savedTexts[textName]) {
                        textName = `${baseName} (${counter})`;
                        counter++;
                    }

                    const saveData = {
                        name: textName,
                        content: variation.content,
                        title: variation.title,
                        meta_description: '', // Could extract from content if needed
                        keywords: variation.keywords,
                        category: 'Batch Generated'
                    };

                    const response = await fetch('/api/save-text', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(saveData)
                    });

                    if (response.ok) {
                        savedCount++;
                        console.log(`Saved: ${textName}`);
                    } else {
                        const errorData = await response.json();
                        errors.push(`${textName}: ${errorData.error || 'Ukendt fejl'}`);
                    }

                } catch (error) {
                    errors.push(`${variation.name}: ${error.message}`);
                }
            }

            // Show results
            if (savedCount > 0) {
                this.showToast(`✅ ${savedCount} tekster gemt succesfuldt!`, 'success');
                // Refresh saved texts list
                this.loadSavedTexts();
            }

            if (errors.length > 0) {
                console.warn('Save errors:', errors);
                this.showToast(`⚠️ ${errors.length} fejl opstod under gem`, 'warning');
            }

            // Clear selection
            checkedBoxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.closest('.batch-item').classList.remove('selected');
            });

        } catch (error) {
            console.error('Error saving batch items:', error);
            this.showToast(`Fejl ved gem: ${error.message}`, 'error');
        } finally {
            saveBtn.textContent = originalText;
            this.updateSaveSelectedButton();
        }
    }

    clearBatchResults() {
        const batchResults = document.getElementById('batch-results');
        const batchGrid = document.getElementById('batch-grid');

        if (batchGrid) {
            batchGrid.innerHTML = '';
        }

        if (batchResults) {
            batchResults.classList.remove('show');
        }

        this.showToast('Batch resultater ryddet', 'info');
    }
    
    // NEW FUNCTIONS FOR EXISTING TRANSLATIONS HANDLING
    
    checkForExistingTranslations(localeStats) {
        if (!localeStats) return false;
        
        // Check if any locale has fewer than 50% missing translations
        for (const locale in localeStats) {
            const stats = localeStats[locale];
            const translationPercentage = ((stats.total_rows - stats.needs_translation) / stats.total_rows) * 100;
            if (translationPercentage > 50) {
                return true; // Has significant existing translations
            }
        }
        return false;
    }
    
    async skipToPreview() {
        console.log('⏭️ Skipping translation, going directly to preview/editing...');
        
        // Show loading indicator
        this.showToast('Henter CSV data...', 'info');
        
        try {
            console.log('Fetching CSV preview data...');
            
            // Get current CSV data from server
            const response = await fetch('/api/csv-preview');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('CSV preview result:', result);
            
            if (result.csv_data && Array.isArray(result.csv_data) && result.csv_data.length > 0) {
                console.log(`Found ${result.csv_data.length} rows of CSV data`);
                
                // Show the translation editor directly
                this.displayTranslationEditor(result.csv_data);
                this.showToast('Åbner redigeringsvindue for eksisterende oversættelser', 'success');
            } else {
                console.warn('No valid CSV data found:', result);
                throw new Error('Ingen gyldig CSV data fundet. Upload en CSV-fil først.');
            }
            
        } catch (error) {
            console.error('Error skipping to preview:', error);
            this.showToast(`Fejl ved åbning af editor: ${error.message}`, 'error');
            
            // Fallback: show detailed error in console
            console.error('Full error details:', {
                error: error,
                message: error.message,
                stack: error.stack
            });
        }
    }
    
    showLanguageSelection() {
        console.log('🌍 Showing language selection for additional translations...');
        
        // Show the language selection section
        const languageSelection = document.querySelector('.language-selection');
        if (languageSelection) {
            languageSelection.closest('.form-group').style.display = 'block';
        }
        
        // Show start translation button
        const startTranslationBtn = document.getElementById('start-translation-btn');
        if (startTranslationBtn) {
            startTranslationBtn.style.display = 'inline-block';
        }
        
        this.showToast('Vælg yderligere sprog til oversættelse', 'info');
    }
}

// Global helper functions for onclick handlers
function handleSkipToPreview() {
    console.log('🔄 handleSkipToPreview called');
    if (window.seoGenerator) {
        window.seoGenerator.skipToPreview();
    } else {
        console.error('❌ seoGenerator not available yet');
        alert('Systemet er ikke klar endnu. Prøv igen om et øjeblik.');
    }
}

function handleShowLanguageSelection() {
    console.log('🔄 handleShowLanguageSelection called');
    if (window.seoGenerator) {
        window.seoGenerator.showLanguageSelection();
    } else {
        console.error('❌ seoGenerator not available yet');
        alert('Systemet er ikke klar endnu. Prøv igen om et øjeblik.');
    }
}

// Initialize the application when DOM is loaded
let seoGenerator; // Make it globally accessible
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    if (!seoGenerator) {
        seoGenerator = new SEOGenerator();
        seoGenerator.init();
        
        // Also make it available on window object for onclick handlers
        window.seoGenerator = seoGenerator;
        
        console.log('✅ seoGenerator initialized and made globally available');
    }
}); 