const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup(values, webApi = {}) {
    const box = { Xrm: { WebApi: webApi } };
    vm.createContext(box);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../D365_Advanced_Samples.js'), 'utf8'), box);
    const notes = new Map();
    const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
        getValue: () => value, setValue: v => { value = v; }, fireOnChange: () => {}
    }]));
    const form = {getAttribute: n => fields[n], data: {entity: {getId: () => ''}},
        ui: {setFormNotification: (m, l, id) => notes.set(id, m), clearFormNotification: id => notes.delete(id)}};
    return { api: box.StudentAdvanced, form, fields, notes, event: {getFormContext: () => form} };
}
test('balance handles missing amounts, invalid negatives and overpayment', () => {
    const s = setup({edu_agreedfee: 20000, edu_amountpaid: 5000, edu_balance: null});
    s.api.calculateBalance(s.event); assert.equal(s.fields.edu_balance.getValue(), 15000);
    s.fields.edu_amountpaid.setValue(null); s.api.calculateBalance(s.event);
    assert.equal(s.fields.edu_balance.getValue(), null);
    s.fields.edu_amountpaid.setValue(-1); s.api.calculateBalance(s.event);
    assert(s.notes.has('fee_validation'));
    s.fields.edu_amountpaid.setValue(21000); s.api.calculateBalance(s.event);
    assert.equal(s.fields.edu_balance.getValue(), -1000);
});
test('duplicate query escapes quotes and ignores older responses', async () => {
    const pending = [], queries = [];
    const s = setup({edu_email: "o'neil@example.com"}, {retrieveMultipleRecords: (t, q) => {
        queries.push(q); return new Promise(resolve => pending.push(resolve));
    }});
    const first = s.api.checkDuplicateEmail(s.event);
    assert(decodeURIComponent(queries[0]).includes("o''neil@example.com"));
    s.fields.edu_email.setValue('new@example.com');
    const second = s.api.checkDuplicateEmail(s.event);
    pending[1]({entities: []}); await second;
    pending[0]({entities: [{}]}); await first;
    assert.equal(s.notes.size, 0);
});
test('course query preserves a manually edited fee', async () => {
    let resolve;
    const s = setup({edu_course: [{id: 'abc'}], edu_agreedfee: 100}, {
        retrieveRecord: () => new Promise(r => {resolve = r;})
    });
    const result = s.api.copyCourseFee(s.event);
    s.fields.edu_agreedfee.setValue(80); resolve({edu_coursefee: 200}); await result;
    assert.equal(s.fields.edu_agreedfee.getValue(), 80);
});
test('BPF guard blocks Next only on configured source stage', () => {
    const s = setup({edu_documentsverified: false});
    s.api.config.documentStageId = 'stage-a';
    s.form.data.process = {getActiveStage: () => ({getId: () => 'stage-a'})};
    let blocked = false, direction = 'Next';
    s.event.getEventArgs = () => ({getDirection: () => direction, preventDefault: () => { blocked = true; }});
    s.api.validateDocumentStage(s.event); assert(blocked);
    blocked = false; direction = 'Previous'; s.api.validateDocumentStage(s.event); assert(!blocked);
    direction = 'Next'; s.fields.edu_documentsverified.setValue(true);
    s.api.validateDocumentStage(s.event); assert(!blocked);
});
test('FetchXML escapes attribute value characters', async () => {
    let query;
    const s = setup({}, {retrieveMultipleRecords: (t, q) => { query = q; return Promise.resolve({entities: []}); }});
    await s.api.findStudentsByEmailFetchXml("o'neil&test@example.com");
    assert(decodeURIComponent(query).includes('o&apos;neil&amp;test@example.com'));
});
