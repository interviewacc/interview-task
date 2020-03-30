import Patient from "./model/Patient";
import fs from "fs";

export default function readData(): Patient[] {
    const buffer = fs.readFileSync('test-data.txt');
    const data = buffer.toString();
    const rows = data.split(/\r?\n/);

    const result: Patient[] = [];

    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].split("|");
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
        result.push(patient);
    }

    return result;
}