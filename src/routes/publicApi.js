const express = require('express');
const router = express.Router();
const { createInstance, getQRCode, getStatus } = require('../services/whatsappService');

// POST /api/whatsapp/connect
// Called by the GitHub Pages frontend to start WhatsApp instance connection
router.post('/whatsapp/connect', async (req, res) => {
  const { instanceName } = req.body;
  const instName = instanceName || process.env.WHATSAPP_INSTANCE_NAME || 'cotou-default';
  try {
    await createInstance(instName);

    const status = await getStatus(instName);
    if (status.connected) {
      return res.json({ alreadyConnected: true });
    }

    const qrData = await getQRCode(instName);
    if (qrData?.base64) {
      return res.json({ ok: true, qrcode: qrData.base64, instanceName: instName });
    }

    return res.json({ ok: true, pending: true, instanceName: instName });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/whatsapp/qr/:instanceName — polling endpoint for QR code
router.get('/whatsapp/qr/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  try {
    const status = await getStatus(instanceName);
    if (status.connected) return res.json({ connected: true });

    const qrData = await getQRCode(instanceName);
    if (qrData?.base64) return res.json({ qrcode: qrData.base64 });

    return res.json({ pending: true });
  } catch (err) {
    return res.json({ pending: true });
  }
});

// GET /api/whatsapp/status/:instanceName — connection state polling
router.get('/whatsapp/status/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  try {
    const status = await getStatus(instanceName);
    return res.json({ connected: status.connected, state: status.state });
  } catch (err) {
    return res.json({ connected: false });
  }
});

module.exports = router;
