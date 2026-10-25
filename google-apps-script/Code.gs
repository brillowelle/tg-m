/**
 * Majan Eye Centre - website forms to Google Sheets
 *
 * Receives the Appointment and Contact forms from the website and appends each
 * submission to its own tab of the spreadsheet ("Appointments", "Contact Messages").
 * Tabs and header rows are created automatically the first time they are needed.
 * Each appointment request is also emailed to the clinic (see CONFIG.notifyEmail).
 *
 * INSTALL (keeps the web app URL the website already uses)
 *   1. Open the Google Sheet > Extensions > Apps Script.
 *   2. Replace the existing code with this file and save.
 *   3. Check CONFIG.notifyEmail below: appointment emails are sent to that address.
 *   4. Select the function "testAppointment" and press Run. Google asks you to
 *      authorise the script to edit the sheet and send email as you: allow it.
 *      A test row appears in the "Appointments" tab and a test email arrives.
 *      (Emails are not sent until this permission has been granted.)
 *   5. Deploy > Manage deployments > edit (pencil) the existing web app >
 *      Version: "New version" > Deploy.
 *      Execute as: Me.  Who has access: Anyone.
 *   6. Open the web app URL in a browser. It should show {"result":"ok", ...}.
 *
 * If you create a NEW deployment instead, the URL changes: update ENDPOINT in
 * assets/js/appointment.js and the URL in contact.html and contact-ar.html.
 *
 * If this script is not attached to the sheet (a standalone project), add a
 * Script Property named SPREADSHEET_ID holding the sheet's ID.
 */

const CONFIG = {
  // Where new-request emails go. Several addresses can be separated by commas.
  // Leave empty ('') to send to the Google account that owns this script.
  notifyEmail: 'treegmajan@gmail.com',
  clinicName: 'Majan Eye Centre',
  timezone: 'Asia/Muscat',
  maxFieldLength: 2000,
  // An identical submission inside this window is treated as a double-click and saved once
  duplicateWindowSeconds: 60,
  // Form used when a request does not say which one it is (the Contact pages do not)
  defaultForm: 'contact',
  forms: {
    appointment: {
      sheet: 'Appointments',
      // request field -> column heading
      columns: {
        name: 'Name',
        phone: 'Phone',
        email: 'Email',
        service: 'Service',
        doctor: 'Doctor',
        date: 'Preferred Date',
        time: 'Preferred Time',
        message: 'Message',
        lang: 'Language',
        page: 'Page',
      },
      required: ['name', 'phone', 'date'],
      // columns the clinic fills in, with their starting value
      extra: { Status: 'New' },
      // email the clinic about each new row
      notify: true,
      emailTitle: 'New appointment request',
    },
    contact: {
      sheet: 'Contact Messages',
      columns: {
        name: 'Name',
        phone: 'Phone',
        email: 'Email',
        doctor: 'Doctor',
        message: 'Message',
        lang: 'Language',
        page: 'Page',
      },
      required: ['name'],
      extra: { Status: 'New' },
      notify: false,
      emailTitle: 'New contact message',
    },
  },
};

/** Form submissions arrive here. */
function doPost(e) {
  try {
    const data = readRequest_(e);

    // Hidden field that only bots fill in: report success and store nothing
    if (data.website) return respond_({ result: 'success' });

    const type = formType_(data);
    const form = CONFIG.forms[type];
    const values = cleanValues_(data, form);

    const missing = form.required.filter(function (field) { return !values[field]; });
    if (missing.length) {
      return respond_({ result: 'error', error: 'Missing required fields: ' + missing.join(', ') });
    }

    if (isDuplicate_(type, values)) return respond_({ result: 'success', duplicate: true });

    const row = appendRow_(form, values);
    const emailed = form.notify ? notifyClinic_(form, values, row) : false;
    return respond_({ result: 'success', form: type, row: row, emailed: emailed });
  } catch (error) {
    console.error(error);
    return respond_({ result: 'error', error: String((error && error.message) || error) });
  }
}

/** Opening the web app URL in a browser shows that the script is live. */
function doGet() {
  return respond_({ result: 'ok', service: 'Majan Eye Centre forms', forms: Object.keys(CONFIG.forms) });
}

/** Optional: run once from the editor to create both tabs before the first submission. */
function setup() {
  const spreadsheet = getSpreadsheet_();
  Object.keys(CONFIG.forms).forEach(function (type) {
    prepareSheet_(spreadsheet, CONFIG.forms[type]);
  });
}

/** Run once from the editor: grants permissions, adds a sample row and sends a sample email. */
function testAppointment() {
  const reply = doPost({
    parameter: {
      form: 'appointment',
      name: 'Test Patient',
      phone: '+968 9000 0000',
      service: 'General eye examination',
      doctor: 'No preference',
      date: Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd'),
      time: 'Morning (9 am - 1 pm)',
      message: 'Test row - safe to delete. ' + new Date().getTime(),
      lang: 'en',
      page: 'appointment.html',
    },
  });
  console.log(reply.getContent());
}

/* ---------------------------------------------------------------- helpers */

/** Fields from a form-encoded body, the query string, or a JSON body. */
function readRequest_(e) {
  const data = {};
  const params = (e && e.parameter) || {};
  Object.keys(params).forEach(function (key) { data[key] = params[key]; });

  const body = e && e.postData && e.postData.contents;
  if (body && body.trim().charAt(0) === '{') {
    try {
      const json = JSON.parse(body);
      Object.keys(json).forEach(function (key) { data[key] = json[key]; });
    } catch (error) {
      // not JSON after all: the form-encoded fields above are used
    }
  }
  return data;
}

/** Which form sent the request. Older pages do not say, so a date means an appointment. */
function formType_(data) {
  const named = String(data.form || '').toLowerCase().trim();
  if (CONFIG.forms[named]) return named;
  return data.date ? 'appointment' : CONFIG.defaultForm;
}

/** Only the fields the form defines, trimmed and capped in length. */
function cleanValues_(data, form) {
  const values = {};
  Object.keys(form.columns).forEach(function (field) {
    const value = data[field] == null ? '' : String(data[field]);
    values[field] = value.replace(/\s+/g, ' ').trim().slice(0, CONFIG.maxFieldLength);
  });
  return values;
}

/** True when the same submission was already saved a moment ago. */
function isDuplicate_(type, values) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, type + JSON.stringify(values), Utilities.Charset.UTF_8);
  const key = 'sub_' + Utilities.base64Encode(digest);
  const cache = CacheService.getScriptCache();
  if (cache.get(key)) return true;
  cache.put(key, '1', CONFIG.duplicateWindowSeconds);
  return false;
}

/** Adds one row and returns its row number. */
function appendRow_(form, values) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // two submissions arriving together must not claim the same row
  try {
    const sheet = prepareSheet_(getSpreadsheet_(), form);
    const headings = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(normalise_);
    const row = headings.map(function () { return ''; });

    const put = function (heading, value) {
      const index = headings.indexOf(normalise_(heading));
      if (index !== -1) row[index] = safeText_(value);
    };
    put('Timestamp', Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss'));
    Object.keys(form.columns).forEach(function (field) { put(form.columns[field], values[field]); });
    Object.keys(form.extra).forEach(function (heading) { put(heading, form.extra[heading]); });

    const rowNumber = sheet.getLastRow() + 1;
    // Plain-text format keeps phone numbers and dates exactly as the visitor typed them
    sheet.getRange(rowNumber, 1, 1, row.length).setNumberFormat('@').setValues([row]);
    return rowNumber;
  } finally {
    lock.releaseLock();
  }
}

/** The form's tab, created with its headings if needed; missing headings are added on the right. */
function prepareSheet_(spreadsheet, form) {
  const wanted = ['Timestamp']
    .concat(Object.keys(form.columns).map(function (field) { return form.columns[field]; }))
    .concat(Object.keys(form.extra));

  let sheet = spreadsheet.getSheetByName(form.sheet);
  if (!sheet) sheet = spreadsheet.insertSheet(form.sheet);

  const lastColumn = sheet.getLastColumn();
  const existing = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(normalise_) : [];
  const missing = wanted.filter(function (heading) { return existing.indexOf(normalise_(heading)) === -1; });
  if (missing.length) {
    sheet.getRange(1, lastColumn + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Emails the clinic about a saved submission. Returns whether the email was sent.
 * The row is already in the sheet, so a mail problem never loses a request.
 */
function notifyClinic_(form, values, rowNumber) {
  try {
    const to = CONFIG.notifyEmail || Session.getEffectiveUser().getEmail();
    if (!to) return false;

    const fields = Object.keys(form.columns)
      .filter(function (field) { return field !== 'lang' && field !== 'page' && values[field]; })
      .map(function (field) { return [form.columns[field], values[field]]; });
    const sheetUrl = getSpreadsheet_().getUrl();
    const subject = form.emailTitle + ': ' + values.name + (values.date ? ' - ' + values.date : '');
    const footer = 'Saved in the "' + form.sheet + '" tab, row ' + rowNumber + '.';

    const text = [form.emailTitle + ' from the website', '']
      .concat(fields.map(function (pair) { return pair[0] + ': ' + pair[1]; }))
      .concat(['', footer, sheetUrl])
      .join('\n');

    const rows = fields.map(function (pair) {
      return '<tr><td style="padding:8px 14px;border-bottom:1px solid #e6ece4;color:#4a5764;white-space:nowrap;vertical-align:top">' + escapeHtml_(pair[0]) +
        '</td><td style="padding:8px 14px;border-bottom:1px solid #e6ece4;color:#071c3c;font-weight:600">' + escapeHtml_(pair[1]) + '</td></tr>';
    }).join('');
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#071c3c;max-width:560px">' +
      '<h2 style="margin:0 0 4px;font-size:20px;color:#1f7a2b">' + escapeHtml_(form.emailTitle) + '</h2>' +
      '<p style="margin:0 0 16px;color:#4a5764">Sent from the ' + escapeHtml_(CONFIG.clinicName) + ' website.</p>' +
      '<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;border-top:1px solid #e6ece4">' + rows + '</table>' +
      '<p style="margin:16px 0 0;color:#4a5764">' + escapeHtml_(footer) + ' <a href="' + sheetUrl + '" style="color:#1f7a2b">Open the sheet</a></p>' +
      '</div>';

    const message = { to: to, subject: subject, body: text, htmlBody: html, name: CONFIG.clinicName + ' Website' };
    // Replying to the email writes straight back to the patient when they gave an address
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || '')) message.replyTo = values.email;
    MailApp.sendEmail(message);
    return true;
  } catch (error) {
    console.error('Notification email failed: ' + error);
    return false;
  }
}

function escapeHtml_(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('No spreadsheet found. Attach the script to the sheet or set SPREADSHEET_ID.');
  return spreadsheet;
}

function normalise_(heading) {
  return String(heading).toLowerCase().trim();
}

/** A leading = + - or @ would be read as a formula, so such values are stored as literal text. */
function safeText_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function respond_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
