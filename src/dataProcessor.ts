import Patient from "./model/Patient";
import LineByLine from "n-readlines";

export default async function processData(handler: (patients: Patient[]) => Promise<void>): Promise<void> {
    // Should be retrieved from configuration
    const BATCH_SIZE = 10;

    const lineByLine = new LineByLine('test-data.txt');

    let patientBuffer: Patient[] = [];

    lineByLine.next(); // Skip first line
    let next = lineByLine.next();

    while (next) {
        const cells = next.toString().split("|");

        const patient: Patient = {
            programId: Number(cells[0]),
            dataSource: cells[1],
            cardNumber: Number(cells[2]),
            memberId: Number(cells[3]),
            firstName: cells[4],
            lastName: cells[5],
            dateOfBirth: new Date(cells[6]),
            address1: cells[7],
            address2: cells[8],
            city: cells[9],
            state: cells[10],
            zip: cells[11],
            telNumber: cells[12],
            email: cells[13],
            consent: cells[14] == 'Y',
            mobile: cells[15]
        };

        patientBuffer.push(patient);
        if (patientBuffer.length == BATCH_SIZE) {
            await handler(patientBuffer);
            patientBuffer = [];
        }

        next = lineByLine.next();
    }

    if (patientBuffer.length > 0) {
        await handler(patientBuffer);
    }
}