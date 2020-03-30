export default class Email {
    constructor(public memberId: number, public email: string, public schedule: Date, public body: string) {}
}