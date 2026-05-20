const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules')) {
                results = results.concat(walkDir(file));
            }
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir(path.join(__dirname, 'apps'));
let replaced = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('\\`')) {
        content = content.replace(/\\`/g, '`');
        fs.writeFileSync(file, content, 'utf8');
        replaced++;
        console.log('Fixed ' + file);
    }
});
console.log('Total fixed: ' + replaced);
