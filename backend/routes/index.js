const router = require('express').Router()
const { populateDatabase, instancesData, usersData } = require('../controllers')

router.post('/populateDb', populateDatabase.getToken)
router.post('/populateDb', populateDatabase.getResources)
router.post('/populateDb', populateDatabase.getPowerVms)
router.post('/populateDb', populateDatabase.getVolumes)
router.post('/populateDb', populateDatabase.getImages)
router.post('/populateDb', populateDatabase.getBilling)
router.post('/populateDb', populateDatabase.populateCloudant)

router.get('/getAllInstances', instancesData.getAllInstances)
router.get('/getInstance/:id', instancesData.getInstance)

router.post('/createUser', usersData.createUser)
router.get('/readUser/:id', usersData.readUser)
router.get('/readAllUsers', usersData.readAllUsers)
router.post('/updateUser/:id', usersData.updateUser)
router.post('/deleteUser/:id', usersData.deleteUser)
router.post('/loginUser', usersData.loginUser)
router.post('/ensureAuthentication/:id', usersData.ensureAuthentication)
router.post('/resetPassword/:id', usersData.resetPassword)

module.exports = router
