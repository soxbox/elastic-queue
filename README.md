# elastic-queue

A [elasticsearch][0] nodejs batching queue.

## Installation

``` bash
  $ npm install elastic-queue
```

## Usage

To use the `ElasticQueue`, you simply need to require it and
then initialize a new queue with parameters:

``` js
var ElasticQueue = require('elastic-queue');

Queue = new ElasticQueue();

var elasticDocument;

elasticDocument = {
  index: 'air-products-na',
  type: 'po',
  id: 0,
  body: {
    metadata: {
      fileName: 'inputFile'
    }
  }
};

Queue.push(elasticDocument);

```

The following `options` are availble to configure `ElasticQueue`:
``` coffeescript
elasticsearch:
  client: # http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/configuration.html#config-options
    host: "localhost:9200"
    log: "info"
    minSockets: 1
    sniffInterval: 60000
    sniffOnStart: true
    suggestCompression: true
concurency: 1 # number of active batches
batchSize: 500 # batch size
commitTimeout: 1000 # wait time before sending partial batches
rateLimit: 2000 # wait time between batches are added to the queue
batchType: "batch_single" # batch_single: convert singles into batches
```

Event Listeners
* __drain__: queue is empty
* __task__: batch is added to queue
* __batchComplete__: batch is complete

``` js
Queue.on('task', function(batch) {
  return console.log("task", batch);
});

Queue.on('batchComplete', function(resp) {
  return console.log("batch complete", resp);
});

Queue.on('drain', function() {
  console.log("\n\nQueue is Empty\n\n");
  return Queue.close();
});
```


[0]: https://github.com/elastic/elasticsearch-js
