# D365 CRM JavaScript training samples

**Sai Kushal Chowdary | Senior Technical Consultant**

- [Original JavaScript library](D365_JavaScript_Sai_Kushal_Chowdary.js)
- [Original PDF guide](D365_JavaScript_Sai_Kushal_Chowdary.pdf)
- [Additional sample functions](D365_Advanced_Samples.js)

The PDF covers the original library. This page documents the additional examples.

## Setup

Upload `D365_Advanced_Samples.js` as a separate JavaScript web resource and add it to the appropriate form. It is standalone and can coexist with `StudentCRM`. Edit `StudentAdvanced.config` to match your solution. No functions register themselves automatically.

All form-event handlers below require **Pass execution context as first parameter**. Command handlers use the explicitly named command parameter instead. Register only the examples applicable to that form.

| Function (prefix `StudentAdvanced.`) | Where to register / call | Prerequisites |
| --- | --- | --- |
| `normalizeEmail` | Email OnChange, before duplicate check | Email text column |
| `checkDuplicateEmail` | Email OnChange on **Student form** | Student table, primary ID, email logical names; read access |
| `calculateBalance` | Agreed Fee and Amount Paid OnChange; optionally OnLoad | Fee, paid and writable balance currency columns |
| `copyCourseFee` | Course OnChange on Admission Enquiry | Course lookup, writable agreed fee; Course fee column and read access |
| `registerCourseFilter` | Admission Enquiry Form OnLoad | Course lookup; Course active state value is 0 |
| `findStudentsByEmailFetchXml` | Call from your own async handler with email string | Student table/ID/email names |
| `getSelectedRecords` | Call from subgrid command/helper | Pass `SelectedControl` |
| `showSelectedRecords` | Subgrid command | Pass `SelectedControl` |
| `showActiveStage` | Main form command | Pass `PrimaryControl`; BPF enabled |
| `registerDocumentStageGuard` | Form OnLoad | Configure source stage GUID and Documents Verified field |
| `moveNextStage` | Main form command | Pass `PrimaryControl`; select active stage, save changes first |
| `canRunSavedRecordCommand` | Classic command custom enable rule | Pass `PrimaryControl`; returns Boolean |

`activeCourseFilter` and `validateDocumentStage` are internal event callbacks. Their registration functions attach them; do not add them directly as form events. Avoid registering the same rule in both form configuration and code.

## Practice scenarios and expected results

1. **Email normalization:** enter ` Student@Example.com `; expect `student@example.com`.
2. **Duplicate detection:** use an existing Student email; expect a warning. Updating the same Student excludes itself. Rapid edits should not show a stale query result.
3. **Balance calculation:** fee 20000, paid 5000 -> 15000. Missing values -> blank balance. Negative inputs -> warning; paid above fee -> negative credit balance.
4. **Course fee:** select Course A, then quickly select Course B; only B's fee should apply. A fee manually edited during retrieval is preserved. Clearing Course clears the agreed fee.
5. **Lookup filter:** open Course search; only active courses should appear. This does not invalidate an existing inactive selection or enforce server-side rules.
6. **FetchXML:** call the helper with an email containing an apostrophe or ampersand; values must be escaped. The helper returns at most 50 matches, not every matching row.
7. **Subgrid:** select two rows and run `showSelectedRecords`; expect both record names and IDs. Empty selection produces a message.
8. **BPF guard:** on the configured source stage, try Next with documents unverified; expect prevention. Verify documents and retry; allow. Previous navigation remains allowed.
9. **BPF navigation:** save changes, select the active stage and run `moveNextStage`; inspect returned status. Handle `end`, `stageGate`, `invalid`, `crossEntity` and any prevention result in your own UX. This sample does not auto-save or skip stages; moving Next across tables is unsupported.
10. **Command availability:** an unsaved or dirty form returns false. Save and refresh the command bar to reassess the rule where necessary.

## Example helper call

```javascript
async function findStudents() {
    try {
        var result = await StudentAdvanced.findStudentsByEmailFetchXml("student@example.com");
        await Xrm.Navigation.openAlertDialog({
            text: "Matches returned: " + result.entities.length
        });
    } catch (error) {
        await Xrm.Navigation.openErrorDialog({ message: error.message });
    }
}
```

## Behaviour and boundaries

- Examples target current model-driven Unified Interface forms. Query examples assume an online connection and appropriate Dataverse privileges.
- Schema names and the BPF stage GUID are examples/configuration, not verified against your environment.
- `copyCourseFee` intentionally overwrites the agreed fee on Course changes. Do not register it where negotiated fees must be retained. This exercise assumes Course and admission fees use the same currency.
- Balance rounding assumes two decimal places. Adjust for your currency precision. The sample calculates a form value, not a secured accounting ledger.
- Duplicate checking is asynchronous and advisory. It does not block saving, prove uniqueness, or cover concurrent requests. Use an appropriate alternate key or server-side validation for mandatory uniqueness; shared family email addresses may be legitimate.
- Client checks, BPF guards and enable rules do not enforce authorization. Enforce critical admission/payment rules on the server.
- Async callbacks check request identity and record identity before applying results; validate navigation behaviour in your actual app.
- JavaScript syntax and five mocked advanced-sample tests passed locally. Neither library has been deployed or tested in your tenant.

## Local verification

Run from this folder with Node.js:

```bash
node --check D365_Advanced_Samples.js
node --test tests/advanced-samples.test.cjs
```

Tests use mock form/API objects; no Dataverse records are read or changed.

## Microsoft references

- [Lookup PreSearch](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/controls/addpresearch)
- [Custom lookup filters](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/controls/addcustomfilter)
- [OnPreStageChange](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/events/onprestagechange)
- [Move Next](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/formcontext-data-process/navigation/movenext)
- [Selected grid rows](https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/grids/grid/getselectedrows)
