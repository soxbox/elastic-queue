elasticsearch = require 'elasticsearch'
Hoek = require 'hoek'
async = require 'async'
events = require 'events'

baseConfig =
  elasticsearch:
    client:
      host: "localhost:9200"
      log: "info"
      minSockets: 1
      sniffInterval: 60000
      sniffOnStart: true
      suggestCompression: true
  concurency: 1 # number of active batches
  batchSize: 500 # batch size
  commitTimeout: 1000 # wait time before sending partial batches
  rateLimit: 2000
  batchHandler: null

class ElasticQueue extends events.EventEmitter

  constructor: (config = {}, esClient) ->
    @config = Hoek.applyToDefaults baseConfig, config
    @queue = []
    @checkTimer = setInterval @check, @config.rateLimit
    @async = async.queue @task, @config.concurency
    @async.drain = @drain
    @count = 1
    unless @config?.batchHandler?
      if esClient?
        @esClient = esClient
      else
        @setup_elastic()

  drain: =>
    if @queue.length is 0
      @emit 'drain'

  setup_elastic: ->
    @esClient = new elasticsearch.Client @config.elasticsearch.client

  push: (task, callback = null) ->
    @queue.push { task: task, callback: callback }

  check: =>
    if @queue.length > 0
      @batch()

  batch: =>
    size = @queue.length
    size = @config.batchSize if size >= @config.batchSize

    if size > 0
      @async.push
        batch: @queue.splice(0, size)
        count: @count++,
        @batchComplete

    if @queue.length > 0
      clearTimeout @batchTimeout
      @batchTimeout =
        setTimeout @batch, @config.rateLimit + @config.commitTimeout

  batchComplete: (err, resp, task) =>
    messages = []

    if resp?.items?
      resp.items.forEach (item) ->
        messages[item?.index?._id] = item

    if task?.batch?
      task.batch.forEach (item) ->
        if item?.callback?
          if item?.task?.id? and messages[item?.task?.id]?
            message = messages[item?.task?.id]
            if [200, 201].indexOf(message?.index?.status) > -1
              item.callback(null, message)
            else
              item.callback(new Error(message.index.error), message)
          else
            item.callback(err, resp)

    return @emit('error', err) if err
    @emit 'batchComplete', resp

  task: (task, callback) =>
    @emit 'task', task
    if @config?.batchHandler?
      @config.batchHandler task, callback
    else
      @elasticSearchBatchHandler task, callback


  elasticSearchBatchHandler: (task, done) =>
    index = []
    for key, value of task.batch
      index.push
        index:
          _index: value.task.index
          _type: value.task.type
          _id: value.task.id
      index.push value.task.body if value.task.body?

    @esClient.bulk body: index, (err, res) ->
      return done(err, null, task) if err
      done(null, res, task)

  close: ->
    if @esClient?
      @esClient.close()

module.exports = exports = ElasticQueue
