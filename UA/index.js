const { curly } = require('node-libcurl');
const { Sequelize, Model, DataTypes } = require('sequelize');
const unescapeUnicode = require('unescape-unicode');
const url = 'https://index.ukrposhta.ua/endpoints-for-apps/index.php?method=get_postoffices_postdistricts_web&pc='

const sequelize = new Sequelize('alistore', 'alistore', 'alistore__PASSWORD_TEST', {
    host: '138.201.30.177',
    dialect: 'mysql',
    port: 3306,

    pool: {
        max: 5,
        min: 0,
        idle: 10000
    }

});

sequelize
    .authenticate()
    .then(() => {
        console.log('Соединение установлено.');
    })
    .catch(err => {
        console.error('Ошибка соединения:', err);
    });

class Zip extends Model {}
Zip.init({
    id: {
        primaryKey: true,
        type:DataTypes.INTEGER
    },
    zip: DataTypes.STRING,
    address: DataTypes.TEXT,
    phone: DataTypes.TEXT,
    schedule: DataTypes.TEXT,
    lat: DataTypes.DECIMAL,
    long: DataTypes.DECIMAL,
    name: DataTypes.STRING,
    country: DataTypes.STRING,
}, { sequelize, modelName: 'zips', timestamps: false });


async function checkinfo(code, attemp = 1){
    if (attemp > 3){
        return 0
    }
    try {
        let obj = await Zip.findOne({where: { zip: code, country: "UA" } })
        if (obj){
            console.log(`${code} in db`)
            return true
        }
        let data = JSON.parse((await curly.get(url+code)).data)

        if (typeof data.length === "number"){
            console.log("index not found")
            return 0
        } else {
            const Entry = data.Entry
            let phones = (Entry.PHONE).replaceAll("-",'').replaceAll("",'').split(",").map(function(num) {
                return "+38"+num;
            }).join(',')
            let long = Entry.LONGITUDE
            let lat = Entry.LATTITUDE
            let address = Entry.CITY_UA + ", "+ Entry.ADDRESS
            let name = Entry.PO_SHORT
            await sequelize.sync();
            await Zip.create({
                zip: code,
                address: address,
                phone: phones,
                lat: lat,
                long: long,
                name: name,
                country: "UA"
            });
        }

    } catch (e) {
        console.log(e)
        setTimeout(checkinfo, 5000, code, attemp+1)
    }


}

var argv = require('minimist')(process.argv.slice(2));

if (!argv.start){
    console.error("error")
} else {
    const start = parseInt(argv.start, 10)
    const end = start + 9999
    
    async function main(current, end){
        console.log(`block ${current} - started`)
        if (current <= end){
            checkinfo(current)
            setTimeout(main, 1000, current+1, end)
        }
    }
    
    
    main(start, end)
}







