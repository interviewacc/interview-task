import {Db, MongoClient} from 'mongodb';
import Patient from "./model/Patient";
import Email from "./model/Email";
import processData from "./dataProcessor";
import connectToMongo from "./mongo";
import validate from "./patientValidator"

async function uploadPatientData(db: Db, patients: Patient[]): Promise<void> {
    const patientCollection = db.collection('Patients');

    if (patients.length > 0) {
        return patientCollection.insertMany(patients).then();
    }
}

async function uploadEmails(db: Db, emails: Email[]): Promise<void> {
    const patientCollection = db.collection('Emails');

    if (emails.length > 0) {
        return patientCollection.insertMany(emails).then();
    }
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

        await processData(async patients => {
            const validPatients = patients.filter(patient => !validate(patient));

            await uploadPatientData(db, validPatients);

            const emails = patients.filter(patient => patient.consent && patient.email != '')
                .map(patient => createEmails(patient.memberId, patient.email))
                .flatMap(emails => emails);

            await uploadEmails(db, emails);
        });
    } finally {
        await client.close();
    }
}

connectToMongo()
    .then(client => upload(client))
    .catch(reason => console.error(`Cant process data. Reason: ${reason.errmsg}`));