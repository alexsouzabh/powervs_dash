const qs = require('qs')
const axios = require('axios')
const { BearerTokenAuthenticator } = require('@ibm-cloud/platform-services/auth')
const ResourceControllerV2 = require('@ibm-cloud/platform-services/resource-controller/v2')
const UsageReportsV4 = require('@ibm-cloud/platform-services/usage-reports/v4')
const { CloudantV1 } = require('@ibm-cloud/cloudant')
const helpers = require('../../helpers')

module.exports = {
    async getToken(req, res, next) {
        const data = qs.stringify({
            'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
            'apikey': process.env.IAM_APIKEY
        })
        const config = {
            method: 'post',
            url: 'https://iam.cloud.ibm.com/identity/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data
        }

        try {
            let { data } = await axios(config)
            req.body.token = data
            next()
        } catch(error) {
            console.log(error)
            res.status(403).send("Provided APIKEY is invalid")
        }
    },

    async getResources(req, res, next) {
        const token = req.body.token.access_token
        const authenticator = new BearerTokenAuthenticator({
            bearerToken: token,
        })
        const resourceControllerService = ResourceControllerV2.newInstance({ 
            authenticator, 
            serviceUrl: 'https://resource-controller.cloud.ibm.com' 
        })

        try {
            let response = await resourceControllerService.listResourceInstances({})
            let resources = response.result.resources
            
            let numResources = response.result.rows_count
            numResources === 0 && res.status(200).send("There are no resources available")

            let instances = resources.reduce((acc, resource) => {
                if(resource.dashboard_url && resource.dashboard_url.match(/power-iaas/g)) {
                    let newResource = {
                        instance_name: resource.name,
                        instance_crn: resource.crn,
                        instance_id: resource.guid,
                        instance_region: helpers.replaceRegion(resource.region_id)
                    }
                    return [...acc, newResource]
                } else return acc
            }, [])

            instances.length === 0 && res.status(200).send("There are no resources available")
            req.body.instances = instances
            next()

        } catch(error) {
            console.log(error)
            res.status(400).send()
        }
    },

    async getPowerVms(req, res, next) {
        const token = req.body.token.access_token
        let instances = req.body.instances
        let newInstances = []
        await Promise.all(instances.map(async instance => {
            let config = {
                method: 'get',
                url: `https://${instance.instance_region}.power-iaas.cloud.ibm.com/pcloud/v1/cloud-instances/${instance.instance_id}/pvm-instances`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'CRN': instance.instance_crn,
                    'Authorization': `Bearer ${token}`
                }
            }
            try {
                let { data } = await axios(config)
                let newPvmInstances = data.pvmInstances.reduce((acc, pvmInstance) => {
                    let aux = pvmInstance.processors * 64
                    let high_ram = pvmInstance.memory > aux ? pvmInstance.memory - aux : 0
                    
                    return [...acc, {
                        server_name: pvmInstance.serverName,
                        sys_type: pvmInstance.sysType,
                        proc_type: pvmInstance.procType,
                        processors: pvmInstance.processors,
                        memory: pvmInstance.memory,
                        os_type: pvmInstance.osType,
                        pvm_instance_id: pvmInstance.pvmInstanceID,
                        creation_date: pvmInstance.creationDate,
                        updated_date: pvmInstance.updatedDate,
                        maxmem: pvmInstance.maxmem,
                        maxproc: pvmInstance.maxproc,
                        minmem: pvmInstance.minmem,
                        minproc: pvmInstance.minproc,
                        status: pvmInstance.status,
                        high_ram
                    }]
                }, [])
                instance.pvm_instances = newPvmInstances
                newInstances.push(instance)
            } catch(error) {
                console.log(error)
                res.status(400).send("")
            }
        }))
        req.body.instances = newInstances
        next()
    },

    async getVolumes(req, res, next) {
        const token = req.body.token.access_token
        let instances = req.body.instances
        let newInstances = []
        let today = new Date()

        await Promise.all(instances.map(async instance => {
            let newPvmInstances = []
            await Promise.all(instance.pvm_instances.map(async pvmInstance => {
                let config = {
                    method: 'get',
                    url: `https://${instance.instance_region}.power-iaas.cloud.ibm.com/pcloud/v1/cloud-instances/${instance.instance_id}/pvm-instances/${pvmInstance.pvm_instance_id}/volumes`,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'CRN': instance.instance_crn,
                        'Authorization': `Bearer ${token}`
                    }
                }
                try {
                    let { data } = await axios(config)
                    let volumes = { 
                        'tier1': { total: 0 }, 
                        'tier3': { total: 0 }, 
                        'standard-legacy': { total: 0 }
                    }
                    data.volumes.map(volume => {
                        let creationDate = volume.creationDate.split(/-|T/g)
                        if(today.getFullYear() > parseInt(creationDate[0]) || today.getMonth() + 1 > parseInt(creationDate[1])) {
                            let yesterday = today.getDate() - 1
                            volumes[volume.diskType][`${yesterday}`] = (volumes[volume.diskType] ? (volumes[volume.diskType][`${yesterday}`] ? volumes[volume.diskType][`${yesterday}`] : 0) : 0) + volume.size
                            volumes[volume.diskType].total = volumes[volume.diskType].total + volume.size
                        } else {
                            let numDays = today.getDate() - parseInt(creationDate[2])
                            if (numDays !== 0) {
                                volumes[volume.diskType][`${numDays}`] = (volumes[volume.diskType] ? (volumes[volume.diskType][`${numDays}`] ? volumes[volume.diskType][`${numDays}`] : 0) : 0) + volume.size
                                volumes[volume.diskType].total = volumes[volume.diskType].total + volume.size
                            }
                        }
                    })
                    pvmInstance.volume_size = volumes
                    newPvmInstances.push(pvmInstance)
                } catch(error) {
                    console.log(error)
                    res.status(400).send("")
                }
            }))
            instance.pvm_instances = newPvmInstances
            newInstances.push(instance)
        }))
        req.body.instances = newInstances
        next()
    },

    async getImages(req, res, next) {
        const token = req.body.token.access_token
        const instances = req.body.instances
        let newInstances = []
        let today = new Date()

        await Promise.all(instances.map(async instance => {
            let images = []
            const config = {
                method: 'get',
                url: `https://${instance.instance_region}.power-iaas.cloud.ibm.com/pcloud/v1/cloud-instances/${instance.instance_id}/images`,
                headers: {
                    'Content-Type': 'application/application/json',
                    'CRN': instance.instance_crn,
                    'Authorization': `Bearer ${token}`
                }
            }

            try {
                let { data } = await axios(config)
                await Promise.all(data.images.map(async image => {
                    const config2 = {
                        method: 'get',
                        url: `https://${instance.instance_region}.power-iaas.cloud.ibm.com/pcloud/v1/cloud-instances/${instance.instance_id}/images/${image.imageID}`,
                        headers: {
                            'Content-Type': 'application/application/json',
                            'CRN': instance.instance_crn,
                            'Authorization': `Bearer ${token}`
                        }
                    }

                    let data2 = (await axios(config2)).data
                    let days = 0

                    let creationDate = data2.creationDate.split(/-|T/g)
                        if(today.getFullYear() > parseInt(creationDate[0]) || today.getMonth() + 1 > parseInt(creationDate[1])) {
                            days = today.getDate() - 1
                        } else {
                            days = today.getDate() - parseInt(creationDate[2])
                        }

                    let newImage = {
                        imageID: data2.imageID,
                        name: data2.name,
                        creationDate: data2.creationDate,
                        size: data2.size,
                        storageType: data2.storageType,
                        days
                    }
                    images.push(newImage)
                }))
            } catch(error) {
                console.log(error)
                res.status(400).send("")
            }

            instance.images = images
            newInstances.push(instance)
        }))
        req.body.instances = newInstances
        next()
    },

    async getBilling(req, res, next) {
        const token = req.body.token.access_token
        const instances = req.body.instances

        const authenticator = new BearerTokenAuthenticator({
            bearerToken: token,
        })
        const serviceClient = UsageReportsV4.newInstance({
            authenticator, 
            serviceUrl: 'https://billing.cloud.ibm.com' 
        })
        let year = new Date().getUTCFullYear() // Added by Ale Souza
        let month = new Date().getUTCMonth() + 1
        const params = {
            accountId: process.env.ACCOUNT_ID,
            //billingmonth: `2022-${month < 10 ? `0${month}` : month}`,
            billingmonth: `${year}-${month < 10 ? `0${month}` : month}`,
            names: true
        }
        const resources = (await serviceClient.getResourceUsageAccount(params)).result.resources
        const powerResources = resources.reduce((acc, resource) => resource.resource_name === "Power Systems Virtual Server" ? [ ...acc, resource ] : acc, [])
        let newInstances = []
        instances.map(instance => {
            let usage = []

            powerResources.map(powerResource => {
                usage = powerResource.resource_instance_id == instance.instance_crn ? powerResource.usage : usage
            })
            
            let ssd = 0 , ram = 0, sos = 0, ess = 0, aix_sol = 0, aix_el = 0, hdd = 0, high_ram = 0
            let ssd_cost = 0 , ram_cost = 0, sos_cost = 0, ess_cost = 0, aix_sol_cost = 0, aix_el_cost = 0, hdd_cost = 0, high_ram_cost = 0
            
            usage.map(item => {
                switch (item.metric_name) {
                    case 'RAM Gigabyte-Hours':
                        ram = item.cost / item.quantity
                        ram_cost = item.cost
                        break
                    case 'SSD Storage Gigabyte-Hours':
                        ssd = item.cost / item.quantity
                        ssd_cost = item.cost
                        break
                    case 'HDD Storage Gigabyte-Hours':
                        hdd = item.cost / item.quantity
                        hdd_cost = item.cost
                        break
                    case 'AIX Enterprise License/Core-Hours':
                        aix_el = item.cost / item.quantity
                        aix_el_cost = item.cost
                        break
                    case 'ESS_VIRTUAL_PROCESSOR_CORE_HOURS':
                        ess = item.cost / item.quantity
                        ess_cost = item.cost
                        break
                    case 'AIX Scale Out License/Core-Hours':
                        aix_sol = item.cost / item.quantity
                        aix_sol_cost = item.cost
                        break
                    case 'Scale Out Shared Virtual Processor Core-Hours':
                        sos = item.cost / item.quantity
                        sos_cost = item.cost
                        break
                    case 'High Use RAM (>64GB/core) Gigabyte-Hours':
                        high_ram = item.cost / item.quantity
                        high_ram_cost = item.cost
                        break
                }
            })

            let billingInstance = {
                ssd: 0,
                ram: 0,
                sos: 0,
                ess: 0,
                aix_sol: 0,
                aix_el: 0,
                hdd: 0,
                high_ram: 0,
                total: 0,
                ssd_cost: parseFloat(ssd_cost.toFixed(2)),
                ram_cost: parseFloat(ram_cost.toFixed(2)),
                sos_cost: parseFloat(sos_cost.toFixed(2)),
                ess_cost: parseFloat(ess_cost.toFixed(2)),
                aix_sol_cost: parseFloat(aix_sol_cost.toFixed(2)),
                aix_el_cost: parseFloat(aix_el_cost.toFixed(2)),
                hdd_cost: parseFloat(hdd_cost.toFixed(2)),
                high_ram_cost: parseFloat(high_ram_cost.toFixed(2)),
                total_cost: parseFloat((ssd_cost + ram_cost + sos_cost + ess_cost + aix_sol_cost + aix_el_cost + hdd_cost + high_ram_cost).toFixed(2)),
                n_a: 0
            }

            let newPvms = []
            let hours = new Date().getUTCHours() - 3

            instance.pvm_instances.map(pvmInstance => {
                let billingPvm = {
                    ssd: 0, //tier3
                    hdd: 0, //tier1
                    ram: 0,
                    sos: 0, // s922
                    ess: 0, // e980
                    aix_sol: 0, //s922
                    aix_el: 0, //e980
                    high_ram: 0,
                    total: 0
                }

                let numDays = 0

                for (var [key, quantity] of Object.entries(pvmInstance.volume_size.tier1)) {
                    if (key !== "total") {
                        numDays = parseInt(key)
                        billingPvm.ssd = ((numDays * 24 + hours) * quantity) + billingPvm.ssd
                    }
                }

                for (var [key, quantity] of Object.entries(pvmInstance.volume_size.tier3)) {
                    if (key !== "total") {
                        numDays = parseInt(key)
                        billingPvm.hdd = ((numDays * 24 + hours) * quantity) + billingPvm.hdd
                    }
                }

                let today = new Date()
                let creationDate = pvmInstance.creation_date.split(/-|T/g)

                if(today.getFullYear() > parseInt(creationDate[0]) || today.getMonth() + 1 > parseInt(creationDate[1])) {
                    numDays = new Date().getDate() - 1
                } else {
                    numDays = today.getDate() - parseInt(creationDate[2])
                }

                billingPvm.ssd = parseFloat((billingPvm.ssd * ssd).toFixed(2))
                billingPvm.hdd= parseFloat((billingPvm.hdd * hdd).toFixed(2))
                billingPvm.ram = parseFloat((pvmInstance.memory * (24 * numDays + hours) * ram).toFixed(2))
                billingPvm.high_ram = parseFloat((pvmInstance.high_ram * 24 * numDays * high_ram).toFixed(2))

                if (pvmInstance.sys_type === "s922") {
                    billingPvm.aix_sol = parseFloat((pvmInstance.processors * (24 * numDays + hours) * aix_sol).toFixed(2))
                    billingPvm.sos = parseFloat((pvmInstance.processors * (24 * numDays + hours) * sos).toFixed(2))
                } else if (pvmInstance.sys_type === "e980") {
                    billingPvm.aix_el = parseFloat((pvmInstance.processors * (24 * numDays + hours) * aix_el).toFixed(2))
                    billingPvm.ess = parseFloat((pvmInstance.processors * (24 * numDays + hours) * ess).toFixed(2))
                }
            
                for (var [key, value] of Object.entries(billingPvm)) billingPvm.total = billingPvm.total + value
                billingPvm.total = parseFloat(billingPvm.total.toFixed(2))

                billingInstance.ssd = parseFloat((billingInstance.ssd + billingPvm.ssd).toFixed(2))
                billingInstance.ram = parseFloat((billingInstance.ram + billingPvm.ram).toFixed(2))
                billingInstance.sos = parseFloat((billingInstance.sos + billingPvm.sos).toFixed(2))
                billingInstance.ess = parseFloat((billingInstance.ess + billingPvm.ess).toFixed(2))
                billingInstance.aix_sol = parseFloat((billingInstance.aix_sol + billingPvm.aix_sol).toFixed(2))
                billingInstance.aix_el = parseFloat((billingInstance.aix_el + billingPvm.aix_el).toFixed(2))
                billingInstance.hdd = parseFloat((billingInstance.hdd + billingPvm.hdd).toFixed(2))
                billingInstance.high_ram = parseFloat((billingInstance.high_ram + billingPvm.high_ram).toFixed(2))
                billingInstance.total = billingInstance.total + billingPvm.total

                pvmInstance.billing = billingPvm
                newPvms.push(pvmInstance)
            })

            let newImages = []
            
            instance.images.map(image => {
                if(image.storageType === "tier1") {
                    image.billing = parseFloat((image.size * (24 * image.days + hours) * ssd).toFixed(2))
                    billingInstance.ssd = parseFloat((billingInstance.ssd + image.billing).toFixed(2))
                    billingInstance.total = billingInstance.total + image.billing
                } else {
                    image.billing = parseFloat((image.size * (24 * image.days + hours) * hdd).toFixed(2))
                    billingInstance.hdd = parseFloat((billingInstance.hdd + image.billing).toFixed(2))
                    billingInstance.total = billingInstance.total + image.billing
                }
                newImages.push(image)
            })

            billingInstance.total = parseFloat(billingInstance.total.toFixed(2))
            billingInstance.n_a = parseFloat((billingInstance.total_cost - billingInstance.total).toFixed(2))

            instance.billing = billingInstance
            instance.pvm_instances = newPvms
            instance.images = newImages
            newInstances.push(instance)
        })

        req.body.instances = newInstances
        next()
    },

    async populateCloudant(req, res, next) {
        let instances = req.body.instances
        const service = helpers.getDatabaseConection() 
        const dateAux = new Date()
        const today = new Date(dateAux.getFullYear(), dateAux.getMonth(), dateAux.getDate(), -3)
        const yesterday = new Date(dateAux.getFullYear(), dateAux.getMonth(), dateAux.getDate()-1, -3)
        
        try {
            if(today.getUTCDate() === 1) {
                let productsDoc = CloudantV1.Document = { instances, date: today.getTime() }
                service.postDocument({
                    db: 'power-vs',
                    document: productsDoc
                })
            } else {
                const selector = CloudantV1.JsonObject = { date: { "$eq": yesterday.getTime() } }
                let result = (await service.postFind({
                    db: 'power-vs',
                    executionStats: true,
                    selector: selector
                })).result.docs[0]

                if(result) {
                    const yesterdayInstances = result.instances
                    instances = helpers.verifyDeletedInstances(instances, yesterdayInstances)
                } 

                // verify if yet exists a document today
                const selectorToday = CloudantV1.JsonObject = { date: { "$eq": today.getTime() } }
                let resultToday = (await service.postFind({
                    db: 'power-vs',
                    executionStats: true,
                    selector: selectorToday
                })).result.docs[0]
                
                let productsDoc = CloudantV1.Document = { instances, date: today.getTime() }
                service.postDocument({
                    db: 'power-vs',
                    document: productsDoc
                })

                if(resultToday) {
                    service.deleteDocument({
                        db: 'power-vs',
                        docId: resultToday._id,
                        rev: resultToday._rev
                    })
                }
            }
            res.status(200).send("Database populated")
        } catch(error) {
            console.log(error)
            res.status(400).send("Unable to populate the database")
        }
    }
}