// Example integration code for embedded.self.xyz
// This shows how the web app can interact with the Android app

class SelfAppIntegration {
    constructor() {
        this.secret = null;
        this.isAndroidApp = false;
        this.init();
    }

    init() {
        // Check if we're running in the Android app
        this.isAndroidApp = typeof window.AndroidApp !== 'undefined';
        
        if (this.isAndroidApp) {
            console.log('Running in Self Android App');
            this.setupAndroidIntegration();
        } else {
            console.log('Running in regular web browser');
        }
    }

    setupAndroidIntegration() {
        // Set up the secret receiver
        window.selfApp = {
            setSecret: (secret) => {
                console.log('Secret received from Android app');
                this.onSecretReceived(secret);
            }
        };

        // Check if secret was already set (fallback)
        // TODO do NOT set on global this is not safe
        if (window.selfAppSecret) {
            this.secret = window.selfAppSecret;
            this.onSecretReceived(window.selfAppSecret);
        }
    }

    onSecretReceived(secret) {
        // Handle the received secret
        console.log('Secret hash received:', secret);
          
        // Store somewhere safe where we can retrieve 
    }


    async readNfcTag() {
        if (!this.isAndroidApp) {
            throw new Error('NFC reading is only available in the Android app');
        }

        try {
            console.log('Requesting NFC read...');
            const nfcData = window.AndroidApp.readNfcTag();
            console.log('NFC data received:', nfcData);
            
            if (nfcData.startsWith('ERROR:')) {
                throw new Error(nfcData);
            }
            
            return this.parseNfcData(nfcData);
        } catch (error) {
            console.error('NFC read error:', error);
            throw error;
        }
    }

    parseNfcData(nfcData) {
        const parts = nfcData.split('|');
        const result = {
            id: null,
            ndefData: [],
            technologies: []
        };

        for (const part of parts) {
            if (part.startsWith('ID:')) {
                result.id = part.substring(3);
            } else if (part.startsWith('NDEF:')) {
                result.ndefData.push(part.substring(5));
            } else if (part.startsWith('TECH:')) {
                result.technologies = part.substring(5).split(',');
            }
        }

        return result;
    }

    async processNfcTag() {
        try {
            const nfcData = await this.readNfcTag();
            console.log('Parsed NFC data:', nfcData);
            
            // Example: Store nfc data in local storage
            // TODO store nfc in our provider
            
           
        } catch (error) {
            console.error('Failed to process NFC tag:', error);
            throw error;
        }
    }

    

    getAppVersion() {
        if (!this.isAndroidApp) {
            return null;
        }
        return window.AndroidApp.getAppVersion();
    }

    // Example UI integration
    createNfcButton() {
        if (!this.isAndroidApp) {
            return null; // Don't show NFC button in regular browser
        }

        const button = document.createElement('button');
        button.textContent = 'Read NFC Tag';
        button.onclick = async () => {
            try {
                button.disabled = true;
                button.textContent = 'Reading...';
                
                const nfcData = await this.processNfcTag();
                
                // Update UI with NFC data
                this.displayNfcData(nfcData);
                
                button.textContent = 'Read NFC Tag';
            } catch (error) {
                console.error('NFC read failed:', error);
                button.textContent = 'Error - Try Again';
            } finally {
                button.disabled = false;
            }
        };
        
        return button;
    }

    displayNfcData(nfcData) {
        // Example: Display NFC data in the UI
        const display = document.getElementById('nfc-display') || 
                       document.createElement('div');
        
        display.innerHTML = `
            <h3>NFC Tag Data</h3>
            <p><strong>ID:</strong> ${nfcData.id}</p>
            <p><strong>Technologies:</strong> ${nfcData.technologies.join(', ')}</p>
            ${nfcData.ndefData.length > 0 ? 
                `<p><strong>NDEF Data:</strong> ${nfcData.ndefData.join(', ')}</p>` : 
                '<p><strong>NDEF Data:</strong> None</p>'
            }
        `;
        
        if (!document.getElementById('nfc-display')) {
            display.id = 'nfc-display';
            document.body.appendChild(display);
        }
    }
}

// Initialize the integration when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.selfAppIntegration = new SelfAppIntegration();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelfAppIntegration;
} 