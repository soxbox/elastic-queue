Hoek = require 'hoek'
elasticsearch = require 'elasticsearch'

baseConfig =
  elasticsearch:
    client:
      host: "localhost:9200"
      log: "info"
      minSockets: 1
      sniffInterval: 60000
      sniffOnStart: true
      suggestCompression: true


class ElasticSearchHandler
  constructor: (config, @client) ->
    @config = Hoek.applyToDefaults baseConfig, config
    unless @client
      @client = new elasticsearch.Client @config.elasticsearch.client

  batchTask: (task, done) ->
    index = []
    for key, value of task.batch
      index.push
        index:
          _index: value.task.index
          _type: value.task.type
          _id: value.task.id
      index.push value.task.body if value.task.body?

    @client.bulk body: index, (err, res) ->
      return done(err, null, task) if err
      done(null, res, task)

  batchComplete: (err, resp, task) ->
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
  close: () ->
    if @client?
      @client.close()


module.exports = ElasticSearchHandler
