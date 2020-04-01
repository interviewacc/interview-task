import Patient from "./model/Patient";
import EmailValidator from "email-validator";

export default function validate(patient: Patient): boolean {
    let valid = true;

    if (patient.email != '' && !EmailValidator.validate(patient.email)) {
        console.warn(`Email ${patient.email} is not valid. Member id ${patient.memberId}`);
        valid = false;
    }

    if (patient.dateOfBirth.getTime() > Date.now()) {
        console.warn(`Date of birth ${patient.dateOfBirth} is not valid. Member id ${patient.memberId}`);
        valid = false;
    }

    // There can be done phone and zip validation

    return valid;
}