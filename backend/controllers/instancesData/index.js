const { CloudantV1 } = require('@ibm-cloud/cloudant')
const helpers = require('../../helpers')

module.exports = {
    async getAllInstances(req, res, next) {
        const service = helpers.getDatabaseConection()
        const dateAux = new Date()
        const today = new Date(dateAux.getFullYear(), dateAux.getMonth(), dateAux.getDate(), -3)

        const selector = CloudantV1.JsonObject = { date: { "$eq": today.getTime() } }
        let result = (await service.postFind({
            db: 'power-vs',
            executionStats: true,
            selector: selector
        })).result.docs[0]

        !result && res.status(204).json([])
        
        let data = result.instances.reduce((acc, instance) => [...acc, { 
            instance_name: instance.instance_name,
            instance_id: instance.instance_id,
            instance_region: instance.instance_region 
        }], [])

        res.status(202).json(data)
    },

    async getInstance(req, res, next) {
        const instanceId = req.params.id
        const service = helpers.getDatabaseConection()
        const dateAux = new Date()
        const today = new Date(dateAux.getFullYear(), dateAux.getMonth(), dateAux.getDate(), -3)

        const selector = CloudantV1.JsonObject = { date: { "$eq": today.getTime() } }
        let result = (await service.postFind({
            db: 'power-vs',
            executionStats: true,
            selector: selector
        })).result.docs[0]

        !result && res.json({ data: [] })

        let data = result.instances.find(instance => instance.instance_id === instanceId)
        res.json(data)
    }
}