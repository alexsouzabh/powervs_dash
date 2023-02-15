const { CloudantV1 } = require('@ibm-cloud/cloudant')
const helpers = require('../../helpers')
const { v4: uuidv4 } = require('uuid')
const { hash } = require("bcrypt");

module.exports = {
    async createUser(req, res, next) {
        const service = helpers.getDatabaseConection()
        let user = req.body
        let userId = uuidv4()
        
        user.id = userId
        user.password = await hash(user.password, 8)
        
        const productsDoc = CloudantV1.Document = { user }
        
        try {
            service.postDocument({
                db: 'users',
                document: productsDoc
            })
            res.send("User created")
        } catch(error) {
            console.log(error)
            res.status(400).send("")
        }
    },

    async readUser(req, res, next) {
        const service = helpers.getDatabaseConection()
        const id = req.params.id

        try {
            const selector = CloudantV1.JsonObject = { user: { id } }
            let result = (await service.postFind({
                db: 'users',
                executionStats: true,
                selector: selector
            })).result.docs[0]
    
            !result ? res.status(404).send("") : res.json(result.user)
            
        } catch(error) {
            console.log(error)
            res.status(400).send("")
        }
    },

    async readAllUsers(req, res, next) {
        const service = helpers.getDatabaseConection()

        try {
            const selector = CloudantV1.JsonObject = { }
            let result = (await service.postFind({
                db: 'users',
                executionStats: true,
                selector: selector
            })).result.docs
    
            res.json(result)
            
        } catch(error) {
            console.log(error)
            res.status(400).send("")
        }
    },

    async updateUser(req, res, next) {
        const service = helpers.getDatabaseConection()
        const id = req.params.id
        const user = req.body

        try {
            const selector = CloudantV1.JsonObject = { user: { id } }
            const result = (await service.postFind({
                db: 'users',
                executionStats: true,
                selector: selector
            })).result.docs[0]
    
            !result && res.status(404).send("")

            const eventDoc = CloudantV1.Document = { user: {
                id,
                name: user.name,
                email: user.email,
                password: user.password ? await hash(user.password, 8) : result.user.password,
                role: user.role
            }}

            service.putDocument({
                db: 'users',
                docId: result._id,
                rev: result._rev,
                document: eventDoc
            })
            
            res.status(200).send("User updated")
            
        } catch(error) {
            console.log(error)
            res.status(400).send("")
        }   
    },

    async deleteUser(req, res, next) {
        const service = helpers.getDatabaseConection()
        const { id } = req.params

        try {
            const selector = CloudantV1.JsonObject = { user: { id } }
            const result = (await service.postFind({
                db: 'users',
                executionStats: true,
                selector: selector
            })).result.docs[0]
    
            !result && res.status(404).send("")

            service.deleteDocument({
                db: 'users',
                docId: result._id,
                rev: result._rev
            })

            res.send("User deleted")

        } catch(error) {
            console.log(error)
            res.status(400).send("")
        }
    }
}