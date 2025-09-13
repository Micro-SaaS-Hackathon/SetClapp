   let mainTextGlobal = '';
        let currentConversation = [];
        
        document.addEventListener('DOMContentLoaded', () => {
            const readBtn = document.getElementById('readText');
            const aiBtn = document.getElementById('sendAI');
            const responseDiv = document.getElementById('aiResponse');
            const navTabs = document.querySelectorAll('.nav-tab');
            const menuSections = document.querySelectorAll('.menu-section');
            const clearArchiveBtn = document.getElementById('clearArchive');
            const archiveList = document.getElementById('archiveList');
            
            // Tab navigation
            navTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const targetTab = tab.dataset.tab;
                    
                    // Update active tab
                    navTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Update active section
                    menuSections.forEach(section => {
                        section.classList.remove('active');
                        if (section.id === `${targetTab}-menu`) {
                            section.classList.add('active');
                        }
                    });
                    
                    // Load archive when switching to archive tab
                    if (targetTab === 'archive') {
                        loadArchive();
                    }
                });
            });
            
            // Extract main text
            readBtn.addEventListener('click', async () => {
                let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            let mainEl = '';
                            if (document.querySelector('main') != undefined) {
                                mainEl = document.querySelector('main');
                            } else if (document.querySelector('article') != undefined) {
                                mainEl = document.querySelector('article');
                            } else {
                                mainEl = document.body;
                            }
                            let mainText = mainEl.innerText;
                            return mainText;
                        }
                    }).then(injectionResults => {
                        mainTextGlobal = injectionResults[0].result;
                        appendMessage('System', 'Main text captured. Ready to send to AI!');
                    });
                } catch (err) {
                    console.error("Script execution failed:", err);
                    appendMessage('System', 'Error extracting main text.');
                }
            });
            
            // Send to AI
            aiBtn.addEventListener('click', async () => {
                if (!mainTextGlobal) {
                    appendMessage('System', "Please extract the main text first.");
                    return;
                }
                
                appendMessage('System', "Sending to AI...");
                
                const systemPromptInput = document.getElementById('systemPrompt');
                try {
                    const apiKey = 'AIzaSyC28kX8U3valZj3TvB_RLz_er4B3hLDGHE';
                    const systemPrompt = systemPromptInput.value.trim();
                    const userPrompt = mainTextGlobal.trim();
                    
                    if (!apiKey || !userPrompt) {
                        appendMessage('System', 'API key and user prompt cannot be empty.');
                        return;
                    }
                    
                    const model = 'gemini-1.5-pro-latest';
                    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    
                    const payload = {
                        contents: [{ parts: [{ text: userPrompt }] }]
                    };
                    
                    if (systemPrompt) {
                        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
                    }
                    
                    const apiResponse = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    
                    const responseData = await apiResponse.json();
                    
                    if (responseData.error) {
                        throw new Error(responseData.error.message);
                    }
                    
                    const text = responseData.candidates[0].content.parts[0].text;
                    appendMessage('AI', text);
                    
                } catch (err) {
                    console.error('API Error:', err.message);
                    appendMessage('System', `Error: ${err.message}`);
                }
            });
            
            // Clear archive
            clearArchiveBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all archived conversations?')) {
                    chrome.storage.local.set({ archivedConversations: [] }, () => {
                        loadArchive();
                    });
                }
            });
            
            // Load existing messages
            loadCurrentConversation();
        });
        
        function appendMessage(sender, text) {
            const responseDiv = document.getElementById('aiResponse');
            const div = document.createElement('div');
            const timestamp = new Date().toLocaleTimeString();
            
            if (sender === 'System') {
                div.className = 'message system';
                div.textContent = text;
            } else {
                div.className = `message ${sender.toLowerCase()}`;
                div.innerHTML = `
                    <div class="message-header">
                        <span class="sender">${sender}</span>
                        <span class="timestamp">${timestamp}</span>
                    </div>
                    <div>${text}</div>
                `;
            }
            
            responseDiv.appendChild(div);
            responseDiv.scrollTop = responseDiv.scrollHeight;
            
            // Add to current conversation
            if (sender !== 'System') {
                currentConversation.push({ sender, text, timestamp });
                
                // Save current conversation and archive if it's an AI response
                if (sender === 'AI') {
                    saveToArchive();
                }
            }
        }
        
        function loadCurrentConversation() {
            chrome.storage.local.get(['currentConversation'], (result) => {
                if (result.currentConversation && result.currentConversation.length > 0) {
                    currentConversation = result.currentConversation;
                    const responseDiv = document.getElementById('aiResponse');
                    responseDiv.innerHTML = '<div class="status">Current conversation loaded</div>';
                    
                    currentConversation.forEach(msg => {
                        appendMessage(msg.sender, msg.text);
                    });
                }
            });
        }
        
        function saveToArchive() {
            chrome.storage.local.get(['archivedConversations'], (result) => {
                const archived = result.archivedConversations || [];
                const conversationCopy = [...currentConversation];
                
                archived.unshift({
                    id: Date.now(),
                    date: new Date().toLocaleString(),
                    messages: conversationCopy,
                    preview: conversationCopy[conversationCopy.length - 1]?.text.substring(0, 100) + '...'
                });
                
                // Keep only last 50 conversations
                if (archived.length > 50) {
                    archived.splice(50);
                }
                
                chrome.storage.local.set({ 
                    archivedConversations: archived,
                    currentConversation: currentConversation
                });
            });
        }
        
        function loadArchive() {
            const archiveList = document.getElementById('archiveList');
            
            chrome.storage.local.get(['archivedConversations'], (result) => {
                const archived = result.archivedConversations || [];
                
                if (archived.length === 0) {
                    archiveList.innerHTML = '<div class="status">No archived conversations yet</div>';
                    return;
                }
                
                archiveList.innerHTML = '';
                
                archived.forEach(conversation => {
                    const div = document.createElement('div');
                    div.className = 'archive-item';
                    div.innerHTML = `
                        <div class="archive-header">
                            <span class="archive-date">${conversation.date}</span>
                            <button class="btn btn-danger" onclick="deleteConversation(${conversation.id})">Delete</button>
                        </div>
                        <div class="archive-content">${conversation.preview}</div>
                    `;
                    
                    div.addEventListener('click', (e) => {
                        if (e.target.tagName !== 'BUTTON') {
                            viewConversation(conversation);
                        }
                    });
                    
                    archiveList.appendChild(div);
                });
            });
        }
        
        function deleteConversation(id) {
            chrome.storage.local.get(['archivedConversations'], (result) => {
                const archived = result.archivedConversations || [];
                const filtered = archived.filter(conv => conv.id !== id);
                
                chrome.storage.local.set({ archivedConversations: filtered }, () => {
                    loadArchive();
                });
            });
        }
        
        function viewConversation(conversation) {
            // Switch to request tab and load conversation
            document.querySelector('[data-tab="request"]').click();
            
            const responseDiv = document.getElementById('aiResponse');
            responseDiv.innerHTML = '<div class="status">Loading archived conversation...</div>';
            
            setTimeout(() => {
                responseDiv.innerHTML = '';
                conversation.messages.forEach(msg => {
                    const div = document.createElement('div');
                    div.className = `message ${msg.sender.toLowerCase()}`;
                    div.innerHTML = `
                        <div class="message-header">
                            <span class="sender">${msg.sender}</span>
                            <span class="timestamp">${msg.timestamp}</span>
                        </div>
                        <div>${msg.text}</div>
                    `;
                    responseDiv.appendChild(div);
                });
                responseDiv.scrollTop = responseDiv.scrollHeight;
            }, 100);
        }
        
        // Make delete function globally accessible
        window.deleteConversation = deleteConversation;