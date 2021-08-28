const fs = require('fs')

module.exports.readHTML = function(path, callback) {
    fs.readFile(path, { encoding: 'utf-8' }, function (err, html) {
        if (err) {
            callback(err)
        }
        else {
            callback(null, html)
        }
    })
}