elasticsearch = require 'elasticsearch'
Hoek = require 'hoek'
async = require 'async'
events = require 'events'

baseConfig =
  elasticsearch:
    client:
      host: "localhost:9200"
      # host: "custer.s03.filex.com:80"
      log: "info"
      minSockets: 1
      sniffInterval: 60000
      sniffOnStart: true
      suggestCompression: true
  concurency: 1 # number of active batches
  batchSize: 500 # batch size
  commitTimeout: 1000 # wait time before sending partial batches
  rateLimit: 2000
  batchType: "batch_single" # batch_single: convert singles into batches

class ElasticQueue extends events.EventEmitter
  constructor: (config = {})->
    @config = Hoek.applyToDefaults baseConfig, config
    @queue = []
    @checkTimer = setInterval @check, @config.rateLimit
    @async = async.queue @task, @config.concurency
    @async.drain = @drain
    @count = 1
    @setup_elastic()

  drain: =>
    if @queue.length is 0
      @emit 'drain'

  setup_elastic: ->
    @esClient = new elasticsearch.Client @config.elasticsearch.client

  push: (item)->
    @queue.push item

  check: =>
    if @queue.length >= @config.batchSize
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

  batchComplete: (err, resp)=>
    return @emit('error', err) if err
    @emit 'batchComplete', resp

  task: (task, callback)=>
    @emit 'task', task
    @[@config.batchType] task, callback

  batch_single: (task, done)=>
    index = []
    for key, value of task.batch
      index.push
        index:
          _index: value.index
          _type: value.type
          _id: value.id
      index.push value.body if value.body?

    @esClient.bulk body: index, (err, res) ->
      return done(err) if err
      done(null, res)

  close: ->
    @esClient.close()

module.exports = exports = ElasticQueue