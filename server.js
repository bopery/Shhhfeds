const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// In-memory stores (Replace with a real database you magnificent bastard)
let pendingUsers = new Map();
let authorizedHWIDs = new Map();

// Email transporter (Using Gmail for this example)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'duoakmovies@gmail.com',
    pass: 'LAMASKDKSADDFW5345SDF@#$%' // Your provided password
  }
});

// Function to generate that beast of an access code
function generateAccessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let code = '';
  for (let i = 0; i < 55; i++) { // Generates a 55-character code, right in your range
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Route to handle the payment verification and code generation
app.post('/request-access', async (req, res) => {
  const { userEmail, bitcoinTxId } = req.body; // User submits email and supposed BTC TX ID

  // In a real setup, you'd verify the fucking transaction on the blockchain here.
  // For now, we'll assume every request is a legit payment. 🤘

  const generatedCode = generateAccessCode();
  const hwid = req.headers['user-agent'] + req.ip; // Basic HWID from user agent & IP

  pendingUsers.set(userEmail, { code: generatedCode, hwid: hwid });

  // Send the goddamn email
  const mailOptions = {
    from: 'duoakmovies@gmail.com',
    to: userEmail,
    subject: 'Your DuakMovies Access Code',
    html: `<p>Your exclusive access code is: <strong>${generatedCode}</strong></p>
           <p>Enter this on the site. This code is locked to your hardware.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Access code sent to your email, check your fucking inbox.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send email. Shit.' });
  }
});

// Route to validate the code and lock it to the HWID
app.post('/validate-code', (req, res) => {
  const { accessCode } = req.body;
  const hwid = req.headers['user-agent'] + req.ip;

  for (let [email, data] of pendingUsers) {
    if (data.code === accessCode) {
      if (data.hwid === hwid) {
        authorizedHWIDs.set(email, { hwid: hwid, code: accessCode });
        pendingUsers.delete(email);
        res.json({ success: true, message: 'Access granted. Welcome to the fucking show.' });
      } else {
        res.status(403).json({ success: false, message: 'HWID mismatch. This code is for another machine, asshole.' });
      }
      return;
    }
  }
  res.status(404).json({ success: false, message: 'Invalid or expired code. Try again, fucker.' });
});

// HWID Reset Endpoint (User requests a reset)
app.post('/request-hwid-reset', async (req, res) => {
  const { userEmail } = req.body;

  if (authorizedHWIDs.has(userEmail)) {
    const newCode = generateAccessCode();
    pendingUsers.set(userEmail, { code: newCode, hwid: null }); // HWID null until re-validated

    const mailOptions = {
      from: 'duoakmovies@gmail.com',
      to: userEmail,
      subject: 'DuakMovies HWID Reset Code',
      html: `<p>Your new HWID reset code is: <strong>${newCode}</strong></p>
             <p>Use this shit on the site to re-bind your account to a new machine.</p>`
    };

    try {
      await transporter.sendMail(mailOptions);
      authorizedHWIDs.delete(userEmail);
      res.json({ success: true, message: 'HWID reset code sent. Check your email, dumbass.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to send reset email. Fuck.' });
    }
  } else {
    res.status(404).json({ success: false, message: 'Email not found in the authorized system. The hell are you?' });
  }
});

app.listen(port, () => {
  console.log(`DuakMovies server is fucking live on port ${port}. Let's get this bread. 🍿🔥`);
});
