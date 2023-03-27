const express = require('express');
const fs = require('fs');

const router = express.Router();
module.exports = router;

/////////////////////////////////////// Class

router.post('/toClassObj', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.name}.class.ts`, {
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
    res.send({message: 'Maybe Created Class ts file'});
});


///////////////////////////////////// Schema  

router.post('/toMongoSchema', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.name}.schema.ts`);

    logger.write(`import { Prop, Schema, SchemaFactory, raw } from "@nestjs/mongoose";\nimport { Document } from 'mongoose';\n`);

    var immportToDoc = obj.import;
    for (let i in immportToDoc){
        logger.write(`import { ${immportToDoc[i]}, ${immportToDoc[i]}Schema } from "./${immportToDoc[i]}.schema"\n`);
    }

    logger.write(`\n@Schema()\nexport class ${obj.name} {\n`)


    var objvars = obj.properties;
    for (let i in objvars){
        logger.write(`\n@Prop({ `);

        if(objvars[i].type == "array"){
            logger.write(`type: [${objvars[i].items.type}Schema]`);
        }
        else if(objvars[i].type == "string" && 'format' in objvars[i]){
            if(objvars[i].fomat == "date-time")
                logger.write(`type: Date`);
            else
                logger.write(`type: String`);
        }
        else{
            let typetmp = objvars[i].type[0].toUpperCase() + objvars[i].type.substring(1);
            logger.write(`type: ${typetmp}`);
        }

        if(objvars[i].autoGen){
            if(objvars[i].autoGenType == "uuid")
                logger.write(`, default: verdis.uuid_v4()`);
            else if(objvars[i].autoGenType == "date-time")
                logger.write(`, default: new Date()`);
            else if(objvars[i].autoGenType == "unique-number")
                logger.write(`, default: new Date().valueOf()`);
        }
        else if(objvars[i].required){
            logger.write(`, required: true`);
        }

        logger.write(`})\n`);

        if(objvars[i].type == "array"){
            logger.write(`${objvars[i].name}: [${objvars[i].items.type}];\n`);
        }
        else{
            logger.write(`${objvars[i].name}: ${objvars[i].type};\n`);
        }
    }

    logger.write(`}\n\n`);

    logger.write(`export const ${obj.name}_MODEL = ${obj.name}.name;\n`);
    logger.write(`export type ${obj.name}Document = ${obj.name} & Document;\n`);
    logger.write(`export const ${obj.name}Schema = SchemaFactory.createForClass(${obj.name});\n`);

    logger.end();
    res.send({message: 'Maybe Created Schema ts file'});
});


/////////////////////////  Persistence


router.post('/ObjServ', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.name}.service.ts`);

    logger.write(`import { Injectable } from '@nestjs/common';\nimport { Model } from "mongoose";\nimport { InjectModel } from "@nestjs/mongoose";\n`);
    logger.write(`import { ${obj.name}_MODEL, ${obj.name}Document } from './${obj.name}.schema';\n\n`);

    logger.write(`@Injectable()\nexport class ${obj.name}Service {\nconstructor(\n`);
    logger.write(`@InjectModel(${obj.name}_MODEL) private readonly ${obj.name}Model: Model<${obj.name}Document>\n) {}\n\n`)

    logger.write(`async PostObj(req) {\n`);
    logger.write(`const createdObject = await this.${obj.name}Model.create(req);\nreturn createdObject;\n`)
    logger.write(`}\n`);

    logger.write(`async PutObj(req) {\n`);
    logger.write(`const updatedJob = await this.${obj.name}Model.findOneAndUpdate(req.filter, req.updateData, {\nnew: true,\n});\n`)
    logger.write(`return updatedJob;\n`);
    logger.write(`}\n`);

    logger.write(`}\n`);
    res.send({message: 'Maybe Created Obj Service ts file'});
});