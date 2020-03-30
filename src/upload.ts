import {Db, MongoClient} from 'mongodb';
import Patient from "./model/Patient";
import Email from "./model/Email";
import readData from "./dataReader";

function uploadPatientData(db: Db, patients: Patient[]): Promise<void> {
    const patientCollection = db.collection('Patients');

    return patientCollection.insertMany(patients).then();
}

function uploadEmails(db: Db, emails: Email[]): Promise<void> {
    const patientCollection = db.collection('Emails');

    return patientCollection.insertMany(emails).then();
}

function createEmails(memberId: number, email: string): Email[] {
    const emails: Email[] = [];

    for (let i = 1; i <= 4; i++) {
        const date = new Date(Date.now());
        date.setDate(date.getDate() + i);
        emails.push(new Email(memberId, email, date, 'test' + i))
    }

    return emails;
}

async function upload(client: MongoClient): Promise<void> {
    try {
    const db = client.db('health');
    const patients = readData();

    await uploadPatientData(db, patients);

    const emails = patients.filter(patient => patient.consent && patient.email != '')
        .map(patient => createEmails(patient.memberId, patient.email))
        .flatMap(emails => emails);

    await uploadEmails(db, emails);
    } finally {
        await client.close();
    }
}

MongoClient.connect('mongodb://localhost:27017')
    .then(client => upload(client))
    .catch(reason => console.error(`Cant process data. Reason: ${reason.errmsg}`));