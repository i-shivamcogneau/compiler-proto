const express = require('express');
const fs = require('fs');

const router = express.Router();
module.exports = router;

router.post('/toWFObjs', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.workflow.name}.ts`, {
        // flags: 'a' // 'a' means appending (old data will be preserved)
    });

    logger.write('import { Process, Processor } from "@nestjs/bull";\nimport { Job } from "bull";\n\n');

    var taskitr = obj.task;
    for (let i in taskitr){
        logger.write(`@Processor('${taskitr[i].dequeue_from}-queue')\n`)
        logger.write(`export class ${taskitr[i].name}Consumer {\n`);
        logger.write(`@Process('${taskitr[i].name}-job')\n`)
        logger.write(`async ${taskitr[i].name}OperationJob(job:Job<unknown>){\n`)
        
        logger.write(`${taskitr[i].code}\n`)
        
        logger.write('}\n')
        logger.write('}\n')
    }


    logger.end();
    res.send({message: 'Hola world'});
});