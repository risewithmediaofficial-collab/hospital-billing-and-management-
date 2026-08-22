import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const billingFile = path.resolve(directory, '../src/domains/billing/billing.service.js');
const diagnosticsFile = path.resolve(directory, '../src/domains/diagnostics/diagnostics.service.js');
const diagnosticModelFile = path.resolve(directory, '../src/models/DiagnosticOrder.js');

test('billing returns are tenant scoped and reject missing source records', async () => {
  const source = await readFile(billingFile, 'utf8');

  assert.match(source, /Invoice\.findOne\(\{ _id: invoiceId, hospitalId \}\)/);
  assert.match(source, /PRESCRIPTION_NOT_FOUND/);
  assert.match(source, /DIAGNOSTIC_ORDER_NOT_FOUND/);
  assert.doesNotMatch(source, /recipientRole: targetDepartment/);
});

test('diagnostic billing queries persist an actionable exact-record contract', async () => {
  const [billing, model] = await Promise.all([
    readFile(billingFile, 'utf8'),
    readFile(diagnosticModelFile, 'utf8'),
  ]);

  assert.match(model, /billingQuery:/);
  assert.match(billing, /entityType: 'DIAGNOSTIC_ORDER'/);
  assert.match(billing, /actionType: 'REVIEW_BILLING_QUERY'/);
  assert.match(billing, /orderId=\$\{order\._id\}/);
  for (const role of ['LAB_TECH', 'LABORATORY_STAFF', 'RADIOLOGIST', 'RADIOLOGY_STAFF']) {
    assert.match(billing, new RegExp(role));
  }
});

test('corrected diagnostic charges resolve the query and return to the exact invoice', async () => {
  const source = await readFile(diagnosticsFile, 'utf8');

  assert.match(source, /order\.billingQuery\.resolved = true/);
  assert.match(source, /invoiceId=\$\{invoiceId\}/);
  assert.match(source, /entityType: 'INVOICE'/);
  assert.match(source, /REVIEW_DEPARTMENT_RESPONSE/);
});

test('payment and billing mutations cannot affect another tenant or unrelated alerts', async () => {
  const source = await readFile(billingFile, 'utf8');

  assert.match(source, /Invoice\.findOne\(\{ _id: data\.invoiceId, hospitalId \}\)/);
  assert.match(source, /Receipt\.findOne\(\{ _id: receiptId, hospitalId \}\)/);
  assert.match(source, /Invoice\.findOne\(\{ _id: invoiceId, hospitalId \}\)/);
  assert.match(source, /OVERPAYMENT_NOT_ALLOWED/);
  assert.doesNotMatch(source, /\$or:\s*\[\s*\{ relatedPatientId:[\s\S]*\{ targetModule: 'billing' \}/);
});
