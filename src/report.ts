import {MongoClient} from "mongodb";
import processData from "./dataProcessor";
import Patient from "./model/Patient";
import equal from "fast-deep-equal";
import Email from "./model/Email";
import TestReport from "./model/TestReport";
import {ExportToCsv} from "export-to-csv";
import fs from "fs";
import connectToMongo from "./mongo";

function findPatientDiffs(flatPatients: Patient[], dbPatients: Patient[]): number[] {
    return flatPatients.filter(flatPatient => {
        const patient = dbPatients.find(dbPatient => dbPatient.memberId == flatPatient.memberId);
        return !(patient && !equal(flatPatient, patient));
    }).map(patient => patient.memberId);
}

function findFirstNameMissing(patients: Patient[]): number[] {
    return patients.filter(patient => patient.firstName == '')
        .map(patient => patient.memberId);
}

function findEmailMissingWithConsent(patients: Patient[]): number[] {
    return patients.filter(patient => patient.email == '' && patient.consent)
        .map(patient => patient.memberId);
}

function findEmailMissing(memberIds: number[], emails: Email[]): number[] {
    return memberIds.filter(memberId => emails.filter(email => email.memberId == memberId).length != 4);
}

function findEmailScheduleMismatch(memberIds: number[], emails: Email[]): number[] {
    return memberIds.filter(memberId => {
        const schedules = emails.filter(email => email.memberId == memberId)
            .map(email => email.schedule)
            .sort((a, b) => a.getSeconds() - b.getSeconds());
        for (let i = 0; i < schedules.length; i++) {
            const date = new Date(Date.now());
            date.setDate(date.getDate() + i + 1);
            if (schedules[i].getDate() != date.getDate()) {
                return true;
            }
        }
        return false;
    });
}

// Should be done via csv append operation to not keep data in memory. Ex. csv-writer
function exportCsv(testReports: TestReport[]): void {
    try {
        const options = {
            fieldSeparator: '|',
            quoteStrings: '"',
            decimalSeparator: '.',
            showLabels: true,
            useTextFile: false,
            headers: ['Test name', 'Test Result']
        };

        const csvExporter = new ExportToCsv(options);

        const generateCsv = csvExporter.generateCsv(testReports, true);
        fs.writeFileSync('test-result.csv', generateCsv);
    } catch (err) {
        console.error(err);
    }
}

async function report(client: MongoClient): Promise<void> {
    const reports: TestReport[] = [];

    try {
        const db = client.db('health');
        const patientCollection = db.collection('Patients');
        const emailCollection = db.collection('Emails');

        const patientDiffs: number[] = [];
        const firstNameMissing: number[] = [];
        const emailMissingWithConsent: number[] = [];
        const emailMissing: number[] = [];
        const emailScheduleMismatch: number[] = [];

        await processData(async flatPatients => {
            const memberIds = flatPatients.map(patient => patient.memberId);
            const dbPatients = await patientCollection
                .find<Patient>({memberId: {$in: memberIds}})
                .toArray();
            findPatientDiffs(flatPatients, dbPatients).forEach(memberId => patientDiffs.push(memberId));
            findFirstNameMissing(flatPatients).forEach(memberId => firstNameMissing.push(memberId));
            findEmailMissingWithConsent(flatPatients).forEach(memberId => emailMissingWithConsent.push(memberId));

            const emailMemberIds = flatPatients.filter(patient => patient.consent && patient.email != '')
                .map(patient => patient.memberId);
            if (emailMemberIds.length > 0) {
                const dbEmails = await emailCollection
                    .find<Email>({memberId: {$in: emailMemberIds}})
                    .toArray();
                findEmailMissing(emailMemberIds, dbEmails).forEach(memberId => emailMissing.push(memberId));
                findEmailScheduleMismatch(emailMemberIds, dbEmails).forEach(memberId => emailScheduleMismatch.push(memberId));
            }
        });

        reports.push(new TestReport('Verify the data in flat file matches the data in patient collection', patientDiffs));
        reports.push(new TestReport('Patient IDs - where first name is missing', firstNameMissing));
        reports.push(new TestReport('Patient IDs - Email address is missing but consent is Y', emailMissingWithConsent));
        reports.push(new TestReport('Verify Emails were created in Email Collection for patients who have CONSENT as Y', emailMissing));
        reports.push(new TestReport('Verify the Email schedule matches with the above', emailScheduleMismatch));
    } finally {
        exportCsv(reports);
        await client.close();
    }
}

connectToMongo()
    .then(client => report(client))
    .catch(reason => console.error(`Cant process data. Reason: ${reason.errmsg}`));