const express = require('express');
const fs = require('fs');

const router = express.Router();
module.exports = router;

router.post('/toWFConsumer', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.workflow.name}.consumer.ts`, {
        // flags: 'a' // 'a' means appending (old data will be preserved)
    });

    logger.write('import { Process, Processor } from "@nestjs/bull";\nimport { Job } from "bull";\n\n');

    var taskitr = obj.task;
    for (let i in taskitr){
        logger.write(`@Processor('${taskitr[i].dequeue_from}Queue')\n`)
        logger.write(`export class ${taskitr[i].name}Consumer {\n`);
        logger.write(`@Process('${taskitr[i].name}Job')\n`)
        logger.write(`async ${taskitr[i].name}OperationJob(job:Job<unknown>){\n`)
        
        logger.write(`${taskitr[i].code}\n`)
        
        logger.write('}\n')
        logger.write('}\n')
    }


    logger.end();
    res.send({message: 'Hola world'});
});

router.post('/toWFProducer', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.workflow.name}.producer.ts`);

    logger.write(`import { InjectQueue } from '@nestjs/bull';\nimport { Injectable } from '@nestjs/common';\nimport { Queue } from 'bull';\n\n`);
    
    var taskitr = obj.task;
    for (let i in taskitr){
        logger.write(`@Injectable()\n`);
        logger.write(`export class ${taskitr[i].dequeue_from}ProducerService {\n`);
        logger.write(`constructor(@InjectQueue('${taskitr[i].dequeue_from}Queue') private queue: Queue) {}\n`);

        logger.write(`async sendJsonObj(jobsObj) {\n`);
        logger.write(`jobsObj["transactionObj"]["updatedAt"] = new Date();\n`);
        logger.write(`jobsObj["transactionObj"]["eventsTillnow"].push({"task": "task2", "enqueueAt": new Date(), "dequeueAt": "", "status": "enqueue"});\n`);

        logger.write(`await this.queue.add('${taskitr[i].name}Job', {\njobsObj\n}, jobsObj.properties);\n`);

        logger.write(`return 'maybe added to the queue';`);        
        logger.write('}\n')
        logger.write('}\n')
    }

    logger.end();
    res.send({message: 'Hola world'});
});


router.post('/toWFFramework', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./TaskQueueFramework.ts`);

    logger.write(`import { Injectable } from '@nestjs/common';\n`);
    
    var taskitr = obj.task;
    for (let i in taskitr){
        logger.write(`import { ${taskitr[i].dequeue_from}ProducerService } from "./${obj.workflow.name}.producer";\n`)
    }
    
    logger.write(`@Injectable()\nexport class FrameworkService {\n`);
    logger.write(`constructor(`);
    for (let i in taskitr){
        if(i>0)
            logger.write(`,`);

        logger.write(`private ${taskitr[i].dequeue_from}ProducerService:${taskitr[i].dequeue_from}ProducerService\n`)
    }
    logger.write(`){}\n`);

    logger.write(`DoNext(obj) {\n`);


    logger.write(`const QueueMap = {`);
    for (let i in taskitr){
        if(parseInt(i) === taskitr.length -1)
            break
        if(i>0)
            logger.write(`,`);
        
        logger.write(`"${taskitr[i].name}" : this.${taskitr[i].enqueue_to}ProducerService.sendJsonObj(obj)\n`)
    }
    logger.write('};\n');

    logger.write(`QueueMap[obj.lastTask];`);

    logger.write('}\n');
    logger.write('}\n');
    logger.end();
    res.send({message: 'Hola world'});
});