export default class Patient {
    constructor(public programId: number, public dataSource: string, public cardNumber: number, public memberId: number,
                public firstName: string, public lastName: string, public dateOfBirth: Date,public address1: string,
                public address2: string, public city: string, public state: string, public zip: string,
                public telNumber: string, public email: string, public consent: boolean, public mobile: string) {}
}