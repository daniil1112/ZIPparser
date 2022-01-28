const { curly } = require('node-libcurl');
const { Sequelize, Model, DataTypes } = require('sequelize');
const post_url = 'https://www.pochta.ru/suggestions/v2/postoffice.find-nearest-by-postalcode-raw-filters'

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
    zip: DataTypes.INTEGER,
    address: DataTypes.TEXT,
    phone: DataTypes.TEXT,
    schedule: DataTypes.TEXT,
    lat: DataTypes.DECIMAL,
    long: DataTypes.DECIMAL,

}, { sequelize, modelName: 'zips', timestamps: false });

let arr = []


async function checkinfo(code, attemp = 1){
    try {
        let obj = await Zip.findOne({where: { zip: code } })
        if (obj){
            console.log(`${code} in db`)
            return true
        }
        let data = (await curly.get(post_url, {
            postFields: JSON.stringify({
                "postalCode":code,
                "limit":1,
            }),
            httpHeader: [
                'Content-Type: application/json',
            ],

        })).data




        if (data.length === 0){
            console.log(`${code} - null`)
            return false
        }
        data = data[0]
        if (data.isClosed){
            console.log(`${code} - closed`)
            return false
        }



        let phones = ''

        if (data.phones){
            data.phones.forEach( phone =>{
                if (phones === '') {
                    phones = `(${phone.phoneTownCode})${phone.phoneNumber}`
                } else {
                    phones = `${phones}, (${phone.phoneTownCode})${phone.phoneNumber}`
                }
            })
        }



        let work = ['выходной', 'выходной', 'выходной', 'выходной', 'выходной', 'выходной', 'выходной']
        let schedule = ''
        if (data.workingHours){
            data.workingHours.forEach(day => {
                let weekDayId = day.weekDayId
                if (day.beginWorkTime){
                    let resultDay = ''
                    resultDay = `${day.beginWorkTime.substr(0,5)}-${day.endWorkTime.substr(0,5)}`
                    let dayLunch = ''
                    let count = 0
                    if (day.lunches){
                        day.lunches.forEach(lunch => {
                            if (dayLunch === ''){
                                dayLunch = `${lunch.beginLunchTime.substr(0,5)}-${lunch.endLunchTime.substr(0,5)}`
                            } else {
                                dayLunch = `${dayLunch}, ${lunch.beginLunchTime.substr(0,5)}-${lunch.endLunchTime.substr(0,5)}`
                            }
                            count++

                        })
                    }
                    if (count === 1){
                        resultDay = `${resultDay} перерыв ${dayLunch}`
                    } else if (count > 1){
                        resultDay = `${resultDay} перерывы ${dayLunch}`
                    }
                    work[weekDayId-1] = resultDay
                }

            })

            let doubles = ['0']

            const wd = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс',]


            for (let i = 1; i<7; i++){
                let pr = false
                for (let j=0; j<doubles.length; j++){
                    if (work[i] === work[(doubles[j][0])]){
                        doubles[j] = `${doubles[j]}${i}`
                        pr = true
                        break
                    }
                }
                if (!pr){
                    doubles.push(`${i}`)
                }
            }
            doubles.forEach(double => {
                let ts = ''
                double.split('').forEach(item => {
                    if (ts === ''){
                        ts = wd[item]
                    } else {
                        ts = `${ts}, ${wd[item]}`
                    }
                })
                ts +=`: ${work[double[0]]}`

                if (schedule === ''){
                    schedule = ts
                } else {
                    schedule +=` ${ts}`
                }
            })
        }

        await sequelize.sync();
        await Zip.create({
            zip : code,
            address: data.address.fullAddress ? data.address.fullAddress : '',
            phone: phones,
            schedule: schedule,
            lat: data.latitude ? data.latitude : '',
            long: data.longitude ? data.longitude : ''
        });

    } catch (e) {
        setTimeout(checkinfo, 5000, code, attemp+1)
    }


}

var argv = require('minimist')(process.argv.slice(2));

if (!argv.start){
    
} else {
    const start = parseInt(argv.start, 10)
    const end = start + 99999
    
    async function main(current, end){
    
        console.log(`block ${current} - started`)
        if (current <= end){
            checkinfo(current)
            setTimeout(main, 1000, current+1, end)
        }
    }
    
    
    main(start, end)
}






