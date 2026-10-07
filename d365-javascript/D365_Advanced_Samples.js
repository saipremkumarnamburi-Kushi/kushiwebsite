/* Prepared for Sai Kushal Chowdary | Senior Technical Consultant
 * Standalone D365 / Dataverse Unified Interface samples.
 * Configure logical names below. Register only the examples you need.
 * No code executes against Dataverse merely by loading this library.
 * See README.md for registration, prerequisites and test cases.
 */
var StudentAdvanced = (function () {
    "use strict";
    var config = {
        studentTable: "edu_student", studentId: "edu_studentid",
        email: "edu_email", courseLookup: "edu_course",
        courseTable: "edu_course", courseFee: "edu_coursefee",
        fee: "edu_agreedfee", paid: "edu_amountpaid", balance: "edu_balance",
        documents: "edu_documentsverified",
        // Set the GUID of the source BPF stage requiring verified documents.
        documentStageId: ""
    };
    var duplicateRuns = new WeakMap();
    var courseRuns = new WeakMap();
    function attr(form, name) {
        var a = form.getAttribute(name);
        if (!a) throw new Error("Missing form column: " + name);
        return a;
    }
    function id(value) { return String(value || "").replace(/[{}]/g, "").toLowerCase(); }
    function warn(form, message, key) { form.ui.setFormNotification(message, "WARNING", key); }
    function escapeXml(value) {
        return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }
    function sameRecord(form, originalId) { return id(form.data.entity.getId()) === originalId; }
    var api = {
        config: config,
        // 1. Email OnChange: normalize without recursively firing OnChange.
        normalizeEmail: function (executionContext) {
            var a = attr(executionContext.getFormContext(), config.email);
            var value = a.getValue();
            if (value !== null) a.setValue(String(value).trim().toLowerCase() || null);
        },
        // 2. Email OnChange: advisory online duplicate check on Student forms.
        // Does not block save or replace server-side uniqueness enforcement.
        checkDuplicateEmail: async function (executionContext) {
            var form = executionContext.getFormContext();
            var token = {}; duplicateRuns.set(form, token);
            var recordId = id(form.data.entity.getId());
            form.ui.clearFormNotification("duplicate_email");
            try {
                var email = String(attr(form, config.email).getValue() || "").trim().toLowerCase();
                if (!email) return;
                var filter = config.email + " eq '" + email.replace(/'/g, "''") + "'";
                if (recordId) filter += " and " + config.studentId + " ne " + recordId;
                var options = "?$select=" + config.studentId + "&$top=1&$filter=" + encodeURIComponent(filter);
                var result = await Xrm.WebApi.retrieveMultipleRecords(config.studentTable, options);
                if (duplicateRuns.get(form) !== token || !sameRecord(form, recordId)) return;
                if (String(attr(form, config.email).getValue() || "").trim().toLowerCase() !== email) return;
                if (result.entities.length) warn(form, "Another student uses this email. Review before saving.", "duplicate_email");
            } catch (error) {
                if (duplicateRuns.get(form) === token && sameRecord(form, recordId)) {
                    warn(form, "Duplicate check could not complete: " + error.message, "duplicate_email");
                }
            }
        },
        // 3. Fee/Paid OnChange: sample assumes one currency with two decimals.
        calculateBalance: function (executionContext) {
            var form = executionContext.getFormContext();
            var fee = attr(form, config.fee).getValue();
            var paid = attr(form, config.paid).getValue();
            var output = attr(form, config.balance);
            form.ui.clearFormNotification("fee_validation");
            if (fee === null || paid === null) { output.setValue(null); return; }
            if (!Number.isFinite(fee) || !Number.isFinite(paid) || fee < 0 || paid < 0) {
                output.setValue(null);
                warn(form, "Fee and amount paid must be non-negative numbers.", "fee_validation");
                return;
            }
            output.setValue(Math.round((fee - paid) * 100) / 100);
            if (paid > fee) warn(form, "Overpayment recorded: negative balance represents a credit.", "fee_validation");
        },
        // 4. Course OnChange: copy current catalogue fee to this application.
        // Explicitly registering this overwrites the agreed fee when Course changes.
        copyCourseFee: async function (executionContext) {
            var form = executionContext.getFormContext();
            var token = {}; courseRuns.set(form, token);
            var recordId = id(form.data.entity.getId());
            form.ui.clearFormNotification("course_fee");
            try {
                var selection = attr(form, config.courseLookup).getValue();
                var feeField = attr(form, config.fee);
                if (!selection || !selection.length) { feeField.setValue(null); feeField.fireOnChange(); return; }
                var courseId = id(selection[0].id);
                var originalFee = feeField.getValue();
                var course = await Xrm.WebApi.retrieveRecord(config.courseTable, courseId, "?$select=" + config.courseFee);
                var current = attr(form, config.courseLookup).getValue();
                if (courseRuns.get(form) !== token || !sameRecord(form, recordId) || !current || id(current[0].id) !== courseId) return;
                // Preserve a fee manually changed while the request was running.
                if (feeField.getValue() !== originalFee) return;
                feeField.setValue(course[config.courseFee] == null ? null : course[config.courseFee]);
                feeField.fireOnChange();
            } catch (error) {
                if (courseRuns.get(form) === token && sameRecord(form, recordId)) warn(form, error.message, "course_fee");
            }
        },
        // 5. Form OnLoad: show active Course records in lookup search results.
        registerCourseFilter: function (executionContext) {
            attr(executionContext.getFormContext(), config.courseLookup).controls.forEach(function (control) {
                control.removePreSearch(api.activeCourseFilter);
                control.addPreSearch(api.activeCourseFilter);
            });
        },
        // Callback used by #5; do not register as a form event.
        activeCourseFilter: function (executionContext) {
            executionContext.getEventSource().addCustomFilter(
                "<filter><condition attribute='statecode' operator='eq' value='0'/></filter>", config.courseTable);
        },
        // 6. FetchXML query by email. Returns first 50 matches; no silent all-rows claim.
        findStudentsByEmailFetchXml: function (email) {
            var value = String(email || "").trim().toLowerCase();
            if (!value) return Promise.resolve({ entities: [] });
            var xml = "<fetch top='50'><entity name='" + escapeXml(config.studentTable) + "'>" +
                "<attribute name='" + escapeXml(config.studentId) + "'/>" +
                "<attribute name='" + escapeXml(config.email) + "'/>" +
                "<filter><condition attribute='" + escapeXml(config.email) + "' operator='eq' value='" +
                escapeXml(value) + "'/></filter></entity></fetch>";
            return Xrm.WebApi.retrieveMultipleRecords(config.studentTable, "?fetchXml=" + encodeURIComponent(xml));
        },
        // 7. Subgrid command: pass SelectedControl. Returns selected row references.
        getSelectedRecords: function (selectedControl) {
            var grid = selectedControl && selectedControl.getGrid();
            if (!grid) throw new Error("Wait for the grid to load and pass SelectedControl.");
            var records = [];
            grid.getSelectedRows().forEach(function (row) {
                var entity = row.getData().getEntity();
                records.push({ id: id(entity.getId()), name: entity.getPrimaryAttributeValue(), table: entity.getEntityName() });
            });
            return records;
        },
        // 8. Subgrid command: inspect selection without modifying records.
        showSelectedRecords: async function (selectedControl) {
            try {
                var rows = api.getSelectedRecords(selectedControl);
                await Xrm.Navigation.openAlertDialog({ text: rows.length ? rows.map(function (r) {
                    return (r.name || r.table) + " - " + r.id;
                }).join("\n") : "Select at least one record." });
            } catch (error) { await Xrm.Navigation.openErrorDialog({ message: error.message }); }
        },
        // 9. Form command: pass PrimaryControl. Display active BPF stage.
        showActiveStage: function (primaryControl) {
            var stage = primaryControl.data.process.getActiveStage();
            return Xrm.Navigation.openAlertDialog({ text: stage ? stage.getName() + "\n" + stage.getId() : "No active BPF stage." });
        },
        // 10. Form OnLoad: opt-in BPF stage guard; Unified Interface only.
        registerDocumentStageGuard: function (executionContext) {
            var form = executionContext.getFormContext();
            if (!/^[0-9a-f-]{36}$/i.test(config.documentStageId)) {
                warn(form, "Configure documentStageId before registering the BPF guard.", "bpf_documents"); return;
            }
            form.data.process.removeOnPreStageChange(api.validateDocumentStage);
            form.data.process.addOnPreStageChange(api.validateDocumentStage);
        },
        // Callback used by #10. Allows backward navigation.
        validateDocumentStage: function (executionContext) {
            var form = executionContext.getFormContext(), args = executionContext.getEventArgs();
            var stage = form.data.process.getActiveStage();
            form.ui.clearFormNotification("bpf_documents");
            if (String(args.getDirection()).toLowerCase() !== "next" || !stage || id(stage.getId()) !== id(config.documentStageId)) return;
            try {
                if (attr(form, config.documents).getValue() === true) return;
                args.preventDefault();
                warn(form, "Verify documents before leaving this stage.", "bpf_documents");
            } catch (error) { args.preventDefault(); warn(form, error.message, "bpf_documents"); }
        },
        // 11. Form command: pass PrimaryControl. Requires saved form and active stage selected.
        moveNextStage: function (primaryControl) {
            var process = primaryControl.data.process;
            if (!process.getActiveStage()) return Xrm.Navigation.openAlertDialog({ text: "No active BPF stage." });
            if (primaryControl.data.entity.getIsDirty()) return Xrm.Navigation.openAlertDialog({ text: "Save your changes first." });
            return new Promise(function (resolve, reject) {
                process.moveNext(function (status) {
                    Xrm.Navigation.openAlertDialog({ text: "Stage navigation result: " + status }).then(function () { resolve(status); }, reject);
                });
            });
        },
        // 12. Command enable rule helper; client convenience, not authorization.
        canRunSavedRecordCommand: function (primaryControl) {
            return Boolean(primaryControl && primaryControl.data.entity.getId() && !primaryControl.data.entity.getIsDirty());
        }
    };
    return api;
}());
