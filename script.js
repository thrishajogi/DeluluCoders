document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyze-button');
    const transcriptInput = document.getElementById('transcript-input');
    const statusMessage = document.getElementById('status-message');
    const outputSection = document.getElementById('output-section');
    const summaryContent = document.getElementById('summary-content');
    const actionsContent = document.getElementById('actions-content');
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    // The URL for your Python backend
    const API_URL = 'http://127.0.0.1:5000/analyze';

    // --- Modal Controls ---
    // Make closeModal available globally so the HTML onclick can find it
    window.closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    function showModal(title, message) {
        modalTitle.textContent = title;
        modalBody.textContent = message;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    // --- Fetch Logic ---
    async function fetchWithRetry(url, options, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, options);
                // If we get a 429 (Too Many Requests), wait and retry
                if (response.status !== 429) return response;
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (error) {
                // Handle network errors (e.g., server down)
                if (i === maxRetries - 1) throw error;
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error("API request failed after multiple retries.");
    }

    // --- Main Analyze Button Click Handler ---
    analyzeButton.addEventListener('click', async () => {
        const transcript = transcriptInput.value.trim();
        if (!transcript) {
            showModal("Input Error", "Please paste the meeting transcript or notes first.");
            return;
        }

        // 1. Set loading state
        analyzeButton.disabled = true;
        analyzeButton.textContent = 'Analyzing...';
        statusMessage.textContent = 'Contacting AI Copilot...';
        outputSection.classList.add('hidden'); // Hide old results

        try {
            // 2. Call the API
            const response = await fetchWithRetry(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: transcript }),
            });

            const data = await response.json();
            
            // 3. Handle errors from the server
            if (!response.ok) {
                showModal("Analysis Error", data.error || "An unknown server error occurred.");
                return;
            }

            // 4. Success: Display the results
            // Format summary into bullet points
            summaryContent.innerHTML = `<ul class="list-disc list-inside space-y-2">
                ${data.summary.split(/[.\n]/).filter(line => line.trim()).map(line => `<li class="mb-2">${line.trim()}.</li>`).join('')}
            </ul>`;

            // Format action items into a numbered list
            actionsContent.innerHTML = `<ol class="list-decimal list-inside space-y-2">
                ${data.action_items.map(item => `<li class="mb-2">${item}</li>`).join('')}
            </ol>`;

            // Show the results section
            outputSection.classList.remove('hidden');
            outputSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            // 5. Handle network/connection errors
            console.error("Fetch Error:", error);
            showModal("Connection Error", "Could not connect to the backend. Make sure 'server.py' is running and not blocked by a firewall.");
        } finally {
            // 6. Reset button state
            analyzeButton.disabled = false;
            analyzeButton.textContent = 'Analyze Meeting';
            statusMessage.textContent = 'Analysis complete.';
        }
    });
});

// --- Copy to Clipboard Function ---
// Must be global so the HTML onclick can find it
function copyContent(elementId, button) {
    const contentElement = document.getElementById(elementId);
    if (!contentElement) return;

    const content = contentElement.innerText;

    // Use the modern Navigator Clipboard API
    navigator.clipboard.writeText(content).then(() => {
        // Success feedback
        button.textContent = 'Copied!';
        button.classList.add('bg-green-100', 'text-green-700');
        setTimeout(() => {
            button.textContent = 'Copy';
            button.classList.remove('bg-green-100', 'text-green-700');
        }, 1500);
    }).catch(err => {
        // Fallback for older browsers or if permissions fail
        console.error('Clipboard API failed:', err);
        alert('Copy failed. Please copy the text manually.');
    });
}