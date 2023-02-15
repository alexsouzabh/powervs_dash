const { CloudantV1, CouchdbSessionAuthenticator } = require('@ibm-cloud/cloudant')

module.exports = {
    replaceRegion(region) {
        const regions = {
            "sao01":"sao",
            "eu-de-1":"eu-de",
            "eu-de-2":"eu-de",
        }
        return regions[region] ? regions[region] : region
    },

    getDatabaseConection() {
        const authenticator = new CouchdbSessionAuthenticator({
            username: process.env.CLOUDANT_USER,
            password: process.env.CLOUDANT_PASSWORD
        })
        const service = new CloudantV1({
            authenticator: authenticator
        })
        service.setServiceUrl(process.env.CLOUDANT_URL)
        return service
    },

    verifyDeletedVms(todayList, yesterdayList) {
        let newTodayList = todayList
        yesterdayList.map(yVm => {
            let contains = false
            for (let i = 0; i < todayList.length; i++) {
                if (yVm.pvm_instance_id == todayList[i].pvm_instance_id) {
                    contains = true
                    break
                }
            }
            !contains && newTodayList.push(yVm)
        })
        return newTodayList
    },

    verifyDeletedInstances(todayList, yesterdayList) {
        let newTodayList = todayList
        yesterdayList.map(yInstance => {
            let contains = false
            for (let i = 0; i < todayList.length; i++) {
                if (yInstance.instance_id == todayList[i].instance_id) {
                    let newVm = this.verifyDeletedVms(todayList[i].pvm_instances, yInstance.pvm_instances)
                    newTodayList[i].pvm_instances = newVm
                    contains = true
                    break
                }
            }
            !contains && newTodayList.push(yInstance)
        })
        return newTodayList
    }
}