/*
 * D365 CRM / Dataverse - Form JavaScript and Web API Actions
 * Prepared for: Sai Kushal Chowdary
 * Position: Senior Technical Consultant
 *
 * SETUP
 * 1. Replace edu_ logical names in config with your actual column names.
 * 2. Create a JavaScript web resource and upload this file.
 * 3. Add the library to your model-driven form.
 * 4. Register StudentCRM.onLoad on Form OnLoad.
 * 5. Register StudentCRM.onDocumentsChange on Documents Verified AND Email OnChange.
 * 6. Register StudentCRM.onSave on Form OnSave if you want the sample validation.
 * 7. For all these events, pass execution context as the first parameter.
 * 8. Save and publish. Test in a development environment first.
 *
 * Only registered handlers execute. Helper functions below do not run on load.
 * Form OnLoad applies this sample rule: Email is required when Documents Verified
 * is Yes. OnSave prevents saving a verified application without an email.
 * This sample assumes Email is otherwise optional. Adjust if your policy differs.
 * Client rules do not enforce security or validate integrations/server writes.
 * Fields used in the rule must be on the form. Missing fields block the sample
 * save handler with a configuration message instead of silently skipping it.
 *
 * Form events receive executionContext; command bar handlers receive
 * PrimaryControl (the form context). See commandShowStudent below.
 *
 * HELPER EXAMPLES (inside a handler, after obtaining formContext):
 * StudentCRM.setValue(formContext, "edu_name", "Sai");
 * StudentCRM.setValue(formContext, "edu_coursefee", 20000);
 * StudentCRM.setValue(formContext, "edu_documentsverified", true);
 * StudentCRM.setValue(formContext, "edu_admissionstatus", YOUR_NUMERIC_CHOICE);
 * StudentCRM.setValue(formContext, "edu_completedon", new Date());
 * StudentCRM.setValue(formContext, "edu_mobile", null); // clear
 * StudentCRM.setValue(formContext, "edu_name", "Sai", true); // also fire OnChange
 * await StudentCRM.createRecord("edu_student", { edu_name: "Sai" });
 * await StudentCRM.retrieveRecord("edu_student", existingGuid, "?$select=edu_name");
 * await StudentCRM.updateRecord("edu_student", existingGuid, { edu_name: "Sai K" });
 * await StudentCRM.deleteRecordWithConfirmation("edu_student", existingGuid);
 *
 * setValue changes form data, not the database until save. Web API updates the
 * database directly, but does not automatically refresh an open form.
 * All Web API helpers return promises: await them and catch failures.
 * retrieveMultiple returns a page with entities and possibly nextLink; use
 * retrieveAll for bounded paging. Do not put lookup GUIDs in text fields.
 * For Web API lookup assignment use the actual navigation property and entity
 * set name, e.g. { "edu_Course@odata.bind": "/edu_courses(GUID)" }; these names
 * are metadata-specific and can differ from the field/table logical names.
 *
 * REFERENCES
 * https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/executioncontext/getformcontext
 * https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/attributes/setvalue
 * https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/clientapi/reference/xrm-webapi
 */

var StudentCRM = (function () {
    "use strict";

    var config = {
        name: "edu_name",
        email: "edu_email",
        documentsVerified: "edu_documentsverified"
    };

    function attribute(formContext, name) {
        var item = formContext.getAttribute(name);
        if (!item) throw new Error("Column is missing from this form: " + name);
        return item;
    }

    function controls(formContext, name, action) {
        // Apply to every control bound to the column, including duplicate controls.
        attribute(formContext, name).controls.forEach(action);
    }

    function guid(id) {
        var value = String(id || "").replace(/[{}]/g, "");
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            throw new Error("Provide a valid existing record GUID.");
        }
        return value;
    }

    function validate(formContext) {
        var verified = attribute(formContext, config.documentsVerified).getValue() === true;
        var email = attribute(formContext, config.email);
        email.setRequiredLevel(verified ? "required" : "none");
        var valid = !verified || String(email.getValue() || "").trim().length > 0;
        formContext.ui.clearFormNotification("student_email_required");
        formContext.ui.clearFormNotification("student_configuration");
        if (!valid) {
            formContext.ui.setFormNotification(
                "Enter the student's email before proceeding.",
                "WARNING", "student_email_required"
            );
        }
        return valid;
    }

    function applyRule(executionContext) {
        var formContext = executionContext.getFormContext();
        try {
            return validate(formContext);
        } catch (error) {
            formContext.ui.setFormNotification(error.message, "ERROR", "student_configuration");
            return false;
        }
    }

    var api = {
        config: config,
        author: "Sai Kushal Chowdary",
        position: "Senior Technical Consultant",

        // FORM EVENTS
        onLoad: applyRule,
        onDocumentsChange: applyRule,
        onSave: function (executionContext) {
            if (!applyRule(executionContext)) {
                executionContext.getEventArgs().preventDefault();
            }
        },

        // DATA: text, number, currency, boolean, Choice, Date, multi-select and null.
        getValue: function (formContext, name) {
            return attribute(formContext, name).getValue();
        },
        setValue: function (formContext, name, value, runOnChange) {
            var field = attribute(formContext, name);
            field.setValue(value);
            if (runOnChange === true) field.fireOnChange();
        },
        getChoiceText: function (formContext, name) {
            return attribute(formContext, name).getText();
        },
        setRequired: function (formContext, name, level) {
            if (["none", "required", "recommended"].indexOf(level) === -1) {
                throw new Error("Requirement level must be none, required or recommended.");
            }
            attribute(formContext, name).setRequiredLevel(level);
        },
        setVisible: function (formContext, name, visible) {
            controls(formContext, name, function (control) { control.setVisible(visible); });
        },
        setDisabled: function (formContext, name, disabled) {
            controls(formContext, name, function (control) { control.setDisabled(disabled); });
        },
        fireOnChange: function (formContext, name) {
            attribute(formContext, name).fireOnChange();
        },

        // LOOKUPS: getLookup returns null for empty, otherwise the first reference.
        getLookup: function (formContext, name) {
            var values = attribute(formContext, name).getValue();
            if (!values || !values.length) return null;
            return { id: guid(values[0].id), name: values[0].name, entityType: values[0].entityType };
        },
        setLookup: function (formContext, name, id, displayName, tableLogicalName, runOnChange) {
            api.setValue(formContext, name, [{
                id: "{" + guid(id) + "}", name: displayName, entityType: tableLogicalName
            }], runOnChange);
        },
        clearLookup: function (formContext, name, runOnChange) {
            api.setValue(formContext, name, null, runOnChange);
        },

        // NOTIFICATIONS
        notify: function (formContext, message, level, id) {
            return formContext.ui.setFormNotification(message, level || "INFO", id || "student_info");
        },
        clearNotification: function (formContext, id) {
            return formContext.ui.clearFormNotification(id || "student_info");
        },
        fieldError: function (formContext, name, message, id) {
            controls(formContext, name, function (control) {
                control.setNotification(message, id || "student_field_error");
            });
        },
        clearFieldError: function (formContext, name, id) {
            controls(formContext, name, function (control) {
                control.clearNotification(id || "student_field_error");
            });
        },
        alert: function (message) {
            return Xrm.Navigation.openAlertDialog({ text: message });
        },
        showError: function (error) {
            return Xrm.Navigation.openErrorDialog({ message: error.message || String(error) });
        },

        // FORM / USER INFORMATION
        getRecordInfo: function (formContext) {
            var id = formContext.data.entity.getId();
            return {
                id: id ? guid(id) : null,
                table: formContext.data.entity.getEntityName(),
                formType: formContext.ui.getFormType(), // 1 Create, 2 Update
                hasChanges: formContext.data.entity.getIsDirty()
            };
        },
        getUserInfo: function () {
            var context = Xrm.Utility.getGlobalContext();
            return { id: guid(context.userSettings.userId), name: context.userSettings.userName,
                clientUrl: context.getClientUrl() };
        },
        save: function (formContext) {
            // Do not call from OnSave: doing so can recursively trigger saving.
            return formContext.data.save();
        },
        refresh: function (formContext) {
            if (formContext.data.entity.getIsDirty()) {
                return Promise.reject(new Error("Save or discard unsaved edits before refreshing."));
            }
            return formContext.data.refresh(false);
        },
        setTabVisible: function (formContext, tabName, visible) {
            var tab = formContext.ui.tabs.get(tabName);
            if (!tab) throw new Error("Tab not found: " + tabName);
            tab.setVisible(visible);
        },
        setSectionVisible: function (formContext, tabName, sectionName, visible) {
            var tab = formContext.ui.tabs.get(tabName);
            var section = tab && tab.sections.get(sectionName);
            if (!section) throw new Error("Section not found: " + sectionName);
            section.setVisible(visible);
        },
        refreshSubgrid: function (formContext, controlName) {
            var grid = formContext.getControl(controlName);
            if (!grid || typeof grid.refresh !== "function") throw new Error("Subgrid not found: " + controlName);
            grid.refresh();
        },
        openRecord: function (table, id) {
            return Xrm.Navigation.openForm({ entityName: table, entityId: guid(id) });
        },
        openNewRecord: function (table, defaultValues) {
            return Xrm.Navigation.openForm({ entityName: table }, defaultValues || {});
        },

        // WEB API CRUD: catch errors at the calling handler.
        createRecord: function (table, data) { return Xrm.WebApi.createRecord(table, data); },
        retrieveRecord: function (table, id, options) {
            return Xrm.WebApi.retrieveRecord(table, guid(id), options);
        },
        retrieveMultiple: function (table, options, pageSize) {
            return Xrm.WebApi.retrieveMultipleRecords(table, options, pageSize || 500);
        },
        retrieveAll: async function (table, options, maxRows) {
            // Bounded interactive query; use server-side processing for bulk exports.
            var limit = maxRows === undefined ? 5000 : maxRows;
            if (!Number.isInteger(limit) || limit < 1) throw new Error("maxRows must be a positive integer.");
            var rows = [], next = options;
            do {
                var result = await Xrm.WebApi.retrieveMultipleRecords(table, next, Math.min(500, limit));
                if (rows.length + result.entities.length > limit) throw new Error("Query exceeds maxRows; narrow the filter.");
                rows = rows.concat(result.entities);
                // Keep the returned query encoded; do not encode nextLink again.
                next = result.nextLink ? result.nextLink.substring(result.nextLink.indexOf("?")) : null;
                if (next && rows.length >= limit) throw new Error("More rows exist than maxRows; narrow the filter.");
            } while (next);
            return rows;
        },
        updateRecord: function (table, id, data) {
            return Xrm.WebApi.updateRecord(table, guid(id), data);
        },
        deleteRecordWithConfirmation: async function (table, id) {
            var recordId = guid(id);
            var result = await Xrm.Navigation.openConfirmDialog({
                title: "Delete record?",
                text: "Delete this " + table + " record? Related data may also be affected.",
                confirmButtonLabel: "Delete", cancelButtonLabel: "Cancel"
            });
            if (!result.confirmed) return { cancelled: true };
            return Xrm.WebApi.deleteRecord(table, recordId);
        },

        // COMMAND BAR: configure PrimaryControl parameter, not executionContext.
        commandShowStudent: async function (primaryControl) {
            try {
                var value = api.getValue(primaryControl, config.name);
                await api.alert("Student: " + (value || "Not entered"));
            } catch (error) {
                await api.showError(error);
            }
        }
    };
    return api;
}());
