const fetch =
  global.fetch ||
  ((...args) =>
    import('node-fetch').then(({ default: f }) => f(...args)));

async function sendSmsFmc({ to, message }) {

  if (!to || !message) {
    throw new Error('to and message are required');
  }

  const apiUrl = process.env.FMC_SMS_API_URL;
  const apiKey = process.env.FMC_SMS_API_KEY;
  const sender = process.env.FMC_SMS_SENDER;

  // Helpful diagnostics without leaking secrets
  const envDiagnostics = {
    FMC_SMS_API_URL_present: Boolean(apiUrl),
    FMC_SMS_API_KEY_present: Boolean(apiKey),
    FMC_SMS_SENDER_present: Boolean(sender)
  };
  console.log('[FMC SMS] Env check:', envDiagnostics);

  if (!apiUrl) {
    throw new Error('FMC_SMS_API_URL missing');
  }

  // Important: FMC SMS returns 401 if the Authorization header is wrong.
  // Some gateways expect `Authorization: Bearer <key>` and others expect the raw key.
  // We'll try BOTH by default.
  if (!apiKey) {
    throw new Error('FMC_SMS_API_KEY missing');
  }

  if (!sender) {
    throw new Error('FMC_SMS_SENDER missing');
  }

  const authHeadersToTry = [
    apiKey, // raw
    `Bearer ${apiKey}`,
    `Token ${apiKey}`,
    `ApiKey ${apiKey}`,
    '__X_API_KEY__'
  ];

  console.log('[FMC SMS] Sending SMS...');
  console.log('TO:', to);

  let res;

  let lastText;
  let lastStatus;
  let lastResOk = false;

  const normalizePhone = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits;
  };

  const toNumber = normalizePhone(to);

  // Many FMC SMS gateways require: FromNumber to be a phone number (10-15 digits),
  // while SenderName can be an alphanumeric sender id.
  // We support both by:
  // - using FMC_SMS_SENDER as SenderName
  // - using FMC_SMS_FROM_NUMBER (if provided) as FromNumber
  // - falling back to FMC_SMS_SENDER if FMC_SMS_FROM_NUMBER is missing
  const fromNumberRaw = process.env.FMC_SMS_FROM_NUMBER;
  let fromNumber = normalizePhone(fromNumberRaw);

  if (!toNumber) {
    throw new Error('Invalid `to` phone number (no digits)');
  }

  const validateFromNumber = (n) => /^\d{10,15}$/.test(n);

  // If FMC_SMS_FROM_NUMBER is missing/invalid, try to safely fall back:
  // - FMC_SMS_SENDER might be numeric and a valid phone number for some gateways.
  // - If it is not numeric/valid, we will throw a clear error.
  if (!fromNumber || !validateFromNumber(fromNumber)) {
    const senderAsNumber = normalizePhone(sender);
    if (senderAsNumber && validateFromNumber(senderAsNumber)) {
      fromNumber = senderAsNumber;
    } else {
      if (!fromNumber) {
        throw new Error('Invalid `fromNumber` (no digits). Set FMC_SMS_FROM_NUMBER in server/.env (10-15 digits, digits only)');
      }
      throw new Error(`Invalid [33mfromNumber[0m (must be 10-15 digits). Got: ${fromNumber}`);
    }
  }



  for (const auth of authHeadersToTry) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (auth === '__X_API_KEY__') {
        headers['x-api-key'] = apiKey;
      } else {
        headers['Authorization'] = auth;
      }

      res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          SenderName: sender,
          ToNumber: toNumber,
          MessageBody: message,
          FromNumber: fromNumber
        })
      });

      // Read response body ONCE per fetch.
      lastText = await res.text();
      lastStatus = res.status;
      lastResOk = res.ok;
      console.log('[FMC SMS] Response:', { status: res.status, authUsed: auth.startsWith('Bearer ') ? 'Bearer' : 'raw' });







      // If success, return immediately



      if (res.ok) {
        try {
          return JSON.parse(lastText);
        } catch {
          return { raw: lastText };
        }
      }

      // Otherwise continue to next auth variant
      console.log('[FMC SMS] Non-OK response, will retry if possible:', lastText);
    } catch (error) {
      throw new Error(`FMCSMS fetch failed: ${error.message}`);
    }
  }

  // NOTE: body was already read in the retry loop. Do not read again.
  const text = lastText;

  console.log('FMCSMS RESPONSE:', text);

  if (!res.ok) {
    throw new Error(`FMCSMS failed: ${res.status} ${text}`);
  }

  try {
    return JSON.parse(text);

  } catch {
    return { raw: text };
  }
}

module.exports = {
  sendSmsFmc
};