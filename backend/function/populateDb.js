const axios = require('axios')

async function main(params) {
    const config = {
        method: 'post',
        url: `${params.URL}/api/populateDb`,
        headers: {
            'Content-Type': 'application/json'
        }
    }

    try {
        let { data } = await axios(config)
        console.log(data)
        return { message: 'Database populated' }
    } catch(error) {
        console.log(error)
        return { message: "Database didn't populate" }
    }
}
