const fs = require("fs")
var path = require('path');
const { isNull } = require("util");


var getFiles = function (dir, files_){

    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
            getFiles(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
};

const files = getFiles('./files')


let result = []

files.forEach(file => {
    src = fs.readFileSync(file, 'utf8')
    let json = JSON.parse(src)
    json.forEach(e => {
        result.push(e)
    })
})


result.forEach(e => {
    let s = `${e.zip};${e.city}, ${e.state};;;${e.lat};${e.long};post;US\n`
    
    if (e.lat &&  e.long){
        fs.appendFileSync('postal_offices.csv', s)
    }
        
})







//
//
// console.log(src)
