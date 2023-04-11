const { CloudantV1 } = require('@ibm-cloud/cloudant')
const helpers = require('../../helpers')
const { v4: uuidv4 } = require('uuid')
const { hash, compare } = require("bcrypt")
const { sign, verify } = require("jsonwebtoken")

module.exports = {
    async createUser(req, res, next) {
        const service = helpers.getDatabaseConection()
        let user = req.body
        let userId = uuidv4()

        user.id = userId
        user.password = await hash(user.password, 8)


        try {
            const selector = CloudantV1.JsonObject = { user: { email: user.email } }
            let result = (await service.postFind({
                db: 'users',
                executionStats: true,
                selector: selector
            })).result.docs[0]

            if (result) {
                res.status(406).send("E-mail já está em uso, por favor utilize outro.")
            } else {
                const productsDoc = CloudantV1.Document = { user }
                service.postDocument({
                    db: 'users',
                    document: productsDoc
                })
                res.send("User created")
            }
        } catch (error) {
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

        } catch (error) {
            console.log(error)
            res.status(400).send("")
        }
    },

    async readAllUsers(req, res, next) {
        const service = helpers.getDatabaseConection()

        try {
            const selector = CloudantV1.JsonObject = {}
            let result = (await service.postFind({
                db: 'users',
                executionStats: true,
                selector: selector,
                sort: ["user"]
            })).result.docs

            res.json(result)

        } catch (error) {
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

            !result && res.status(404).send("Usuário não encontrado.")

            const eventDoc = CloudantV1.Document = {
                user: {
                    id,
                    name: user.name,
                    email: user.email,
                    password: user.password ? await hash(user.password, 8) : result.user.password,
                    role: user.role
                }
            }

            service.putDocument({
                db: 'users',
                docId: result._id,
                rev: result._rev,
                document: eventDoc
            })

            res.status(200).send("User updated")

        } catch (error) {
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

            !result && res.status(404).send("Usuário não encontrado.")

            service.deleteDocument({
                db: 'users',
                docId: result._id,
                rev: result._rev
            })

            res.send("User deleted")

        } catch (error) {
            console.log(error)
            res.status(400).send("")
        }
    },

    async loginUser(req, res, next) {
        const service = helpers.getDatabaseConection()
        const user = req.body

        try {
            const selector = CloudantV1.JsonObject = { user: { email: user.email } }
            const result = (await service.postFind({
                db: 'users',
                executionStats: true,
                selector: selector
            })).result.docs[0]

            if (!result) {
                res.status(404).send()
            } else {
                const comparePassword = await compare(user.password, result.user.password)
                if (!comparePassword) {
                    res.status(404).send()
                } else {
                    const token = sign({}, "71ce41b9695dca078a73e0382b4b8d88", {
                        subject: String(result.user.id),
                        expiresIn: "5h"
                    })

                    result.user.token = token
                    res.json(result.user)
                }
            }
        } catch (error) {
            console.log(error)
            res.status(400).send("")
        }
    },

    async ensureAuthentication(req, res, next) {
        const id = req.params.id
        !id && res.status(401).send()

        const token = req.headers.authentication
        !token && res.status(401).send()

        try {
            const decode = verify(token, "71ce41b9695dca078a73e0382b4b8d88");
            id === decode.sub ? res.send() : res.status(401).send()
        } catch (err) {
            if (err.message === "invalid token") res.status(401).send()
            else {
                console.log(err)
                res.status(400).send()
            }
        }
    },

    async resetPassword(req, res, next) {
        const service = helpers.getDatabaseConection()
        const id = req.params.id
        const body = req.body

        !id && res.status(401).send("As senhas não correspondem.")
        body.new_password !== body.new_password_confirm && res.status(401).send()

        try {
            const selector = CloudantV1.JsonObject = { user: { id } }
            const result = (await service.postFind({
                db: 'users',
                executionStats: true,
                selector: selector
            })).result.docs[0]

            if (!result) {
                res.status(404).send()
            } else {
                if (body.action === "user") {
                    const comparePassword = await compare(body.old_password, result.user.password)
                    if (!comparePassword) res.status(404).send("Senha atual está incorreta.")
                }
                
                const eventDoc = CloudantV1.Document = {
                    user: {
                        id,
                        name: result.user.name,
                        email: result.user.email,
                        password: await hash(body.new_password, 8),
                        role: result.user.role
                    }
                }

                service.putDocument({
                    db: 'users',
                    docId: result._id,
                    rev: result._rev,
                    document: eventDoc
                })
                res.status(200).send()
            }
        } catch (error) {
            console.log(error)
            res.status(400).send("")
        }
    }
}