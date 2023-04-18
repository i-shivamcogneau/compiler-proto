const express = require('express');
const fs = require('fs');

const router = express.Router();
module.exports = router;

router.post('/toWFConsumer', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.workflow.name}.consumer.ts`, {
        // flags: 'a' // 'a' means appending (old data will be preserved)
    });
    logger.write(`// From Compiler\n\n`);

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
    logger.write(`// From Compiler\n\n`);

    logger.write(`import { InjectQueue } from '@nestjs/bull';\nimport { Injectable } from '@nestjs/common';\nimport { Queue } from 'bull';\n\n`);
    
    var taskitr = obj.task;
    for (let i in taskitr){
        logger.write(`@Injectable()\n`);
        logger.write(`export class ${taskitr[i].dequeue_from}ProducerService {\n`);
        logger.write(`constructor(@InjectQueue('${taskitr[i].dequeue_from}Queue') private queue: Queue) {}\n`);

        logger.write(`async sendJsonObj(transacObj) {\n`);
        
        logger.write(`await this.queue.add('${taskitr[i].name}Job', { transacObj });\n`);

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
    logger.write(`// From Compiler\n\n`);

    logger.write(`import { Injectable } from '@nestjs/common';\n`);
    
    var taskitr = obj.task;
    for (let i in taskitr){
        logger.write(`import { ${taskitr[i].dequeue_from}ProducerService } from "./${obj.workflow.name}.producer";\n`)
    }
    
    logger.write(`\n@Injectable()\nexport class FrameworkService {\n`);
    logger.write(`constructor(`);
    for (let i in taskitr){
        if(i>0)
            logger.write(`,`);

        logger.write(`private ${taskitr[i].dequeue_from}ProducerService:${taskitr[i].dequeue_from}ProducerService\n`)
    }
    logger.write(`){}\n`);

    logger.write(`async DoNext(transacobj, lastTask) {\n`);


    logger.write(`const QueueMap = {`);
    for (let i in taskitr){
        if(parseInt(i) === taskitr.length -1)
            break
        if(i>0)
            logger.write(`,`);
        
        if(i == 0)
            logger.write(`"initial" : ()=> this.${taskitr[i].dequeue_from}ProducerService.sendJsonObj(transacobj),\n`);

        logger.write(`"${taskitr[i].name}" : ()=> this.${taskitr[i].enqueue_to}ProducerService.sendJsonObj(transacobj)\n`);
    }
    logger.write('};\n');

    logger.write(`return await QueueMap[lastTask]();`);

    logger.write('}\n');
    logger.write('}\n');
    logger.end();
    res.send({message: 'Hola world'});
});

// req of object contains:
// 1. array of dequeue_from
// 2. array of tasks
// eg: {workflowname: "", arr_dequeue_from: [], arr_tasks: []}
router.post('/TaskQueueindex', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./index.TQservice.ts`);
    logger.write(`// From Compiler\n\n`);

    logger.write(`import { FrameworkService } from "./TaskQueueFramework";\n`)

    // dequeue_from for queue 
    // task names accordingly
    for (let i in obj.arr_dequeue_from){
        logger.write(`import { ${obj.arr_dequeue_from[i]}ProducerService } from "./${obj.workflowname}.producer";\n`);
    }

    for (let i in obj.arr_tasks){
        logger.write(`import { ${obj.arr_tasks[i]}Consumer } from "./${obj.workflowname}.consumer";\n`);
    }
    
    logger.write('\nexport const TaskQueuesServices = [FrameworkService');


    for (let i in obj.arr_dequeue_from){
        logger.write(`, ${obj.arr_dequeue_from[i]}ProducerService `);
    }

    for (let i in obj.arr_tasks){
        logger.write(`, ${obj.arr_tasks[i]}Consumer `);
    }

    logger.write('];');

    logger.end();

    res.send({message: 'Maybe Created index.TQservice ts file'});
});


// req of object contains:
// 1. array of dequeue_from
// 2. workflow's name
// eg: {workflowname: "", arr_dequeue_from: []}
router.post('/QueueNameindex', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.workflowname}queues.ts`);
    logger.write(`// From Compiler\n\n`);
    
    logger.write(`\nexport const ${obj.workflowname}queues = [\n`);


    for (let i in obj.arr_dequeue_from){
        logger.write(`\t{ name: '${obj.arr_dequeue_from[i]}Queue' ,},\n`);
    }

    logger.write(']');

    logger.end();

    res.send({message: 'Maybe Created workflow Queues ts file'});
});