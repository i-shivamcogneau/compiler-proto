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

    logger.write('import { Process, Processor } from "@nestjs/bull";\nimport { Job } from "bull";\nimport { FrameworkService } from "./TaskQueueFramework";\n');
    logger.write('import { FrameworkObjectService } from "../DataModel/DataModelFramework";\nimport { verdis_transaction } from "../Framework/transactionObj/transaction.framework";\n\n')


    var taskitr = obj.task;
    for (let i in taskitr){
        logger.write(`@Processor('${taskitr[i].dequeue_from}Queue')\n`)
        logger.write(`export class ${taskitr[i].name}Consumer {\n`);
        logger.write(`constructor (private readonly frameworkService: FrameworkService,\nprivate readonly frameworkObjectService: FrameworkObjectService,\nprivate readonly verdis_transaction: verdis_transaction){}\n`);

        logger.write(`@Process('${taskitr[i].name}Job')\n`)
        logger.write(`async ${taskitr[i].name}OperationJob(job:Job<unknown>){\n`)
        
        logger.write(`var Obj = job.data["transacObj"];\n`);
        logger.write(`Obj.Transaction_Obj = await this.verdis_transaction.addEvents({"task_event":"Start","task_name":"${taskitr[i].name}","task_status":""} , Obj.Transaction_Obj.uuid);\n\n`);

        logger.write(`${taskitr[i].code}\n`)
        
        logger.write(`\nObj.Transaction_Obj = await this.verdis_transaction.addEvents({"task_event":"End","task_name":"${taskitr[i].name}","task_status":""} , Obj.Transaction_Obj.uuid);\n\n`);

        if(taskitr.length-1 != i)
            logger.write(`this.frameworkService.DoNext(Obj, "${taskitr[i].name}")\n`)
        else
            logger.write(`console.log(Obj.Transaction_Obj.uuid);\n`)
        
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
    
    logger.write(`import { verdis_transaction } from '../Framework/transactionObj/transaction.framework';\n\n`);

    logger.write(`\n@Injectable()\nexport class FrameworkService {\n`);
    logger.write(`constructor(`);
    for (let i in taskitr){
        // if(i>0)
        //     logger.write(`,`);

        logger.write(`private ${taskitr[i].dequeue_from}ProducerService:${taskitr[i].dequeue_from}ProducerService,\n`)
    }
    logger.write(`private readonly verdis_transaction: verdis_transaction`)
    logger.write(`){}\n`);

    logger.write(`async DoNext(transacobj, lastTask) {\n`);

    logger.write(`if(lastTask == "initial"){\n
        transacobj = {"Transaction_Obj": await this.verdis_transaction.create(), "data": transacobj}
    \n}`)

    logger.write(`const QueueMap = {`);
    for (let i in taskitr){
        if(parseInt(i) === taskitr.length -1 && i!=0)
            break
        if(i>0)
            logger.write(`,`);
        
        if(i == 0)
            logger.write(`"initial" : ()=> this.${taskitr[i].dequeue_from}ProducerService.sendJsonObj(transacobj),\n`);
        
        if(i == 0 && taskitr.length == 1)
            break;

        logger.write(`"${taskitr[i].name}" : ()=> this.${taskitr[i].enqueue_to}ProducerService.sendJsonObj(transacobj)\n`);
    }
    logger.write('};\n');

    logger.write(`if (lastTask in QueueMap)\n`)
    logger.write(`\treturn await QueueMap[lastTask]();\n\n`);
    logger.write(`return "task not present";`)

    logger.write('}\n');
    logger.write('}\n');
    logger.end();
    res.send({message: 'may be created workflow for task and queue'});
});

// req of object contains:
// 1. array of dequeue_from
// 2. array of tasks
// eg: {workflowname: "", arr_dequeue_from: [], arr_tasks: []}
router.post('/TaskQueueindex', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./${obj.workflowname}index.TQservice.ts`);
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
    
    logger.write(`\nexport const ${obj.workflowname}TaskQueuesServices = [FrameworkService`);


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
router.post('/WFQueueNameindex', (req, res) => {
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

// array of workflow 
// wfnames = [wf1, wf2]
router.post('/MainQueueNameindex', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./MainWorkFlowqueues.ts`);
    logger.write(`// From Compiler\n\n`);
    
    for(let i in obj.wfnames){
        logger.write(`import { ${obj.wfnames[i]}queues } from './${obj.wfnames[i]}queues'\n`);
    }
    
    logger.write(`\nexport const MainQueuesIdx = [\n`);


    for (let i in obj.wfnames){
        logger.write(`\t...${obj.wfnames[i]}queues,`);
    }

    logger.write('\n]');

    logger.end();

    res.send({message: 'Maybe Created main Queues ts file'});
});


// array of workflow 
// wfnames = [wf1, wf2]
router.post('/MainTaskQueueindex', (req, res) => {
    var obj = req.body;
    var logger = fs.createWriteStream(`./MainTaskQueueindex.ts`);
    logger.write(`// From Compiler\n\n`);
    
    for(let i in obj.wfnames){
        logger.write(`import { ${obj.wfnames[i]}TaskQueuesServices } from './${obj.wfnames[i]}index.TQservice'\n`);
    }
    
    logger.write(`\nexport const MainTaskQueuesServices = [\n`);


    for (let i in obj.wfnames){
        logger.write(`\t...${obj.wfnames[i]}TaskQueuesServices,`);
    }

    logger.write('\n]');

    logger.end();

    res.send({message: 'Maybe Created main Task Queue service ts file'});
});


// Creating directories for each workflows
// wfnames = [wf1, wf2]
router.post('/WFDirCrt', (req, res) => {
    var obj = req.body;
    
    for(let i in obj.wfnames){
        if (!fs.existsSync(obj.wfnames[i]+'_WorkFlowFolder')){
            fs.mkdirSync(obj.wfnames[i]+'_WorkFlowFolder');
        }
    }
    
    res.send({message: 'Maybe Created WF Directories'});
});

