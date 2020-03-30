import {MongoClient} from "mongodb";
import readData from "./dataReader";
import Patient from "./model/Patient";
import equal from "fast-deep-equal";
import Email from "./model/Email";
import TestReport from "./model/TestReport";
import {ExportToCsv} from "export-to-csv";
import fs from "fs";

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
        for (let i = 0; i < 4; i++) {
            const date = new Date(Date.now());
            date.setDate(date.getDate() + i + 1);
            if (schedules[i].getDate() != date.getDate()) {
                return true;
            }
        }
        return false;
    });
}

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

        const flatPatients = readData();
        const memberIds = flatPatients.map(patient => patient.memberId);
        const dbPatients = await patientCollection
            .find<Patient>({memberId: {$in: memberIds}})
            .toArray();

        const patientDiffs = findPatientDiffs(flatPatients, dbPatients);
        reports.push(new TestReport('Verify the data in flat file matches the data in patient collection', patientDiffs));

        const firstNameMissing = findFirstNameMissing(flatPatients);
        reports.push(new TestReport('Patient IDs - where first name is missing', firstNameMissing));

        const emailMissingWithConsent = findEmailMissingWithConsent(flatPatients);
        reports.push(new TestReport('Patient IDs - Email address is missing but consent is Y', emailMissingWithConsent));

        const emailMemberIds = flatPatients.filter(patient => patient.consent && patient.email != '')
            .map(patient => patient.memberId);
        const dbEmails = await emailCollection
            .find<Email>({memberId: {$in: emailMemberIds}})
            .toArray();

        const emailMissing = findEmailMissing(emailMemberIds, dbEmails);
        reports.push(new TestReport('Verify Emails were created in Email Collection for patients who have CONSENT as Y', emailMissing));

        const emailScheduleMismatch = findEmailScheduleMismatch(emailMemberIds, dbEmails);
        reports.push(new TestReport('Verify the Email schedule matches with the above', emailScheduleMismatch));
    } finally {
        exportCsv(reports);
        await client.close();
    }
}

MongoClient.connect('mongodb://localhost:27017')
    .then(client => report(client))
    .catch(reason => console.error(`Cant process data. Reason: ${reason.errmsg}`));