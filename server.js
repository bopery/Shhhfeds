const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Your movie files should be in this folder
app.use('/movies', express.static('movies'));

// Store valid access codes and their HWIDs
let activeCodes = new Map();

// Blockchain.com API to verify Bitcoin payments
async function verifyBitcoinPayment(txId, expectedAmount = 20) {
    try {
        const response = await axios.get(`https://blockchain.info/rawtx/${txId}`);
        const tx = response.data;
        
        // Check if payment went to your address
        const outputs = tx.out;
        const paymentReceived = outputs.some(output => {
            return output.addr === 'bc1qfqnctztm3cpxm5z7s4dnwxx7ng2v4yauhcqrpt' && 
                   output.value >= expectedAmount * 100000000; // Convert to satoshis
        });
        
        return paymentReceived;
    } catch (error) {
        console.log('Error verifying payment:', error);
        return false;
    }
}

// Generate that secure access code
function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let code = '';
    for (let i = 0; i < 55; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Verify payment and generate access code
app.post('/verify-payment', async (req, res) => {
    const { email, txId } = req.body;
    
    if (!email || !txId) {
        return res.json({ success: false, message: 'Missing email or transaction ID' });
    }

    const paymentVerified = await verifyBitcoinPayment(txId);
    
    if (paymentVerified) {
        const accessCode = generateAccessCode();
        // Store code without HWID initially - will be set on first use
        activeCodes.set(accessCode, { email, hwid: null, used: false });
        
        res.json({ 
            success: true, 
            accessCode: accessCode,
            message: 'Payment verified! Your access code has been generated.'
        });
    } else {
        res.json({ 
            success: false, 
            message: 'Payment not found or insufficient amount. Check the transaction ID, dumbass.' 
        });
    }
});

// Validate access code and bind to HWID
app.post('/validate-code', (req, res) => {
    const { accessCode, hwid } = req.body;
    
    if (!activeCodes.has(accessCode)) {
        return res.json({ success: false, message: 'Invalid access code, fucker.' });
    }
    
    const codeData = activeCodes.get(accessCode);
    
    if (codeData.hwid && codeData.hwid !== hwid) {
        return res.json({ success: false, message: 'This code is already bound to another device.' });
    }
    
    // Bind to this HWID if first use
    if (!codeData.hwid) {
        codeData.hwid = hwid;
        codeData.used = true;
        activeCodes.set(accessCode, codeData);
    }
    
    res.json({ success: true, message: 'Access granted, motherfucker!' });
});

// HWID reset - generate new code
app.post('/reset-hwid', (req, res) => {
    const { email, accessCode } = req.body;
    
    if (!activeCodes.has(accessCode)) {
        return res.json({ success: false, message: 'Invalid access code.' });
    }
    
    const codeData = activeCodes.get(accessCode);
    
    if (codeData.email !== email) {
        return res.json({ success: false, message: 'Email does not match access code.' });
    }
    
    // Generate new code
    const newAccessCode = generateAccessCode();
    activeCodes.delete(accessCode);
    activeCodes.set(newAccessCode, { email, hwid: null, used: false });
    
    res.json({ 
        success: true, 
        newAccessCode: newAccessCode,
        message: 'HWID reset complete. Use your new access code.' 
    });
});

// Get movie list (you'll populate this with your actual movies)
app.get('/movie-list', (req, res) => {
    const movies = [
        {
            id: 1,
            title: "The Last Stand 2024",
            filename: "the_last_stand_2024.mp4",
            thumbnail: "thumb1.jpg",
            size: "1.4GB"
        },
        {
            id: 2, 
            title: "Cyber Heist",
            filename: "cyber_heist.mkv",
            thumbnail: "thumb2.jpg",
            size: "2.1GB"
        },
        {
            id: 3,
            title: "Midnight Run",
            filename: "midnight_run.avi",
            thumbnail: "thumb3.jpg", 
            size: "1.8GB"
        }
        // Add your actual fucking movies here
    ];
    
    res.json({ success: true, movies: movies });
});

app.listen(port, () => {
    console.log(`DuakMovies server running on port ${port} 🚀`);
});
