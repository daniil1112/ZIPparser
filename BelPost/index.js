const { curly } = require('node-libcurl');
const { Sequelize, Model, DataTypes } = require('sequelize');
const post_url = 'https://api.belpost.by/api/v1/ops/'

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
    t: DataTypes.INTEGER,
}, { sequelize, modelName: 'zips', timestamps: false });



async function checkinfo(code, attemp = 1){
    if (attemp > 3){
        return 1
    }
    try {
        let obj = await Zip.findOne({where: { t: code,country: "BY" } })
        if (obj){
            console.log(`${code} in db`)
            return true
        }
        let data = (await curly.get(post_url+code))
        if (data.statusCode === 200){
            data = data.data
            let address = data.address
            let zip = data.postcode
            let phones = data.phone.replaceAll(" ","").replaceAll("(","").replaceAll(")","").replaceAll("-","")
            let lat = data.latitude
            let long = data.longitude
            let name = data.name

            const wd = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
            let time = ["","","","","","",""]
            const tr = {
                "monday": 0,
                "tuesday": 1,
                "wednesday": 2,
                "thursday": 3,
                "friday": 4,
                "saturday": 5,
                "sunday": 6,
            }


            data.timetable.forEach(e => {
                let type = e.type
                let w = type.split("_")
                if (w.length === 2){
                    if (w[0] in tr) {
                        let start = tr[w[0]]
                        let end = tr[w[1]]
                        let c = start
                        while (true){
                            if (!e.from || !e.to){
                                time[c] = "Выходной"
                            } else {
                                if (e.lunch_from && e.lunch_to){
                                    time[c] = `${e.from}-${e.to}, перерыв ${e.lunch_from}-${e.lunch_to}`
                                } else {
                                    time[c] = `${e.from}-${e.to}`
                                }
                            }
                            if (start > end && c === 6){
                                c = 0
                            } else {
                                c = c+1
                            }
                            if ((c === end+1) || (end === 6 && c === 0)){
                                break
                            }
                        }
                    }
                } else {
                    if (w[0] in tr) {
                        if (!e.from || !e.to){
                            time[tr[w[0]]] = "Выходной"
                        } else {
                            if (e.lunch_from && e.lunch_to){
                                time[tr[w[0]]] = `${e.from}-${e.to}, перерыв ${e.lunch_from}-${e.lunch_to}`
                            } else {
                                time[tr[w[0]]] = `${e.from}-${e.to}`
                            }
                        }
                    }
                }
            })

            let doubles = ['0']
            let schedule = ""


            for (let i = 1; i<7; i++){
                let pr = false
                for (let j=0; j<doubles.length; j++){
                    if (time[i] === time[(doubles[j][0])]){
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
                ts +=`: ${time[double[0]]}`

                if (schedule === ''){
                    schedule = ts+";"
                } else {
                    schedule +=` ${ts};`
                }
            })
            schedule = schedule.substring(0, schedule.length - 1)


            await sequelize.sync();
            await Zip.create({
                zip : zip,
                address: address,
                phone: phones,
                schedule: schedule,
                lat: lat,
                long: long,
                country: "BY",
                name: name,
                t: code
            });
        }
    } catch (e) {
        console.error(e)
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






