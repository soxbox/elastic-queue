Hoek = require 'hoek'
async = require 'async'
events = require 'events'

baseConfig =
  concurency: 1 # number of active batches
  batchSize: 500 # batch size
  commitTimeout: 1000 # wait time before sending partial batches
  rateLimit: 2000
  batchHandler: 'elasticsearch-handler'

class ElasticQueue extends events.EventEmitter

  constructor: (config = {}, @client) ->
    @config = Hoek.applyToDefaults baseConfig, config
    @queue = []
    @checkTimer = setInterval @check, @config.rateLimit
    @setupHandler()
    @async = async.queue @task, @config.concurency
    @async.drain = @drain
    @count = 1

  setupHandler: () ->
    if typeof @config?.batchHandler is 'string'
      @handler = new ( require "./handlers/#{@config?.batchHandler}" )(@config, @client)
    else
      @handler = new @config?.batchHandler(@config, @client)

  drain: =>
    if @queue.length is 0
      @emit 'drain'

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
    @handler.batchComplete err, resp, task
    return @emit('error', err) if err
    @emit 'batchComplete', resp

  task: (task, callback) =>
    @emit 'task', task
    @handler.batchTask task, callback

  close: ->
    @handler.close()

module.exports = ElasticQueue
