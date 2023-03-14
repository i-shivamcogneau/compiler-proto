const express = require('express');
const fs = require('fs');

const router = express.Router();
module.exports = router;

router.post('/toClassObj', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.name}.ts`, {
        // flags: 'a' // 'a' means appending (old data will be preserved)
    });

    var immportToDoc = obj.import;
    for (let i in immportToDoc){
        logger.write(`\nimport ${immportToDoc[i]} from './${immportToDoc[i]}'\n`);
    }

    logger.write(`\nexport default class ${obj.name} {\n`);
    
    var objvars = obj.properties;
    for (let i in objvars){
        if(objvars[i].type != "array")
            logger.write(`\n${objvars[i].name}: ${objvars[i].type};\n`);
        else
            logger.write(`\n${objvars[i].name}: ${objvars[i].items.type}[];\n`);
    }

    logger.write(`\nconstructor(props) {\n`);

    var objreq = obj.required;
    logger.write(`\nif(`);
    for(let i in objreq){
        if(i !=0)
        logger.write(` && `);
        logger.write(`!props.${objreq[i]}`);
    }
    logger.write(`)\n`);
    logger.write(`console.log('missing stuff')\n`);


    logger.write(`else{\n`);
    for (let i in objvars){
        if(objvars[i].autoGen == false && objvars[i].type != "array"){
            logger.write(`\nthis.${objvars[i].name} = props.${objvars[i].name};\n`);
        }
        else if(objvars[i].autoGen == false && objvars[i].type == "array"){
            logger.write(`\nif(props.${objvars[i].name}.length != 0){\n`);
            logger.write(`\nthis.${objvars[i].name} = new Array(new ${objvars[i].name}(props.${objvars[i].name}[0]));\n`);
            logger.write(`for (let i = 1; i < props.${objvars[i].name}.length; i++) {`)            
            logger.write(`\nthis.${objvars[i].name}.push(new ${objvars[i].name}(props.${objvars[i].name}[i]));\n`);
            logger.write(`\n}\n`);
            logger.write(`\n}\n`);
        }else if(objvars[i].autoGen == true && objvars[i].autoGenType == "uuid"){
            logger.write(`\nthis.${objvars[i].name} = crypto.randomUUID();\n`);
        }else if(objvars[i].autoGen == true && objvars[i].autoGenType == "unique-number"){
            logger.write(`\nthis.${objvars[i].name} = new Date().valueOf();\n`);
        }else if(objvars[i].autoGen == true && objvars[i].autoGenType == "date-time"){
            logger.write(`\nthis.${objvars[i].name} = (JSON.parse(JSON.stringify(new Date()))).toString();\n`);
        }

    }

    logger.write(`\n}\n`);


    logger.write(`\n}\n`);

    logger.write(`\n}\n`);
    logger.end();
    res.send({message: 'Cyka world'});
});