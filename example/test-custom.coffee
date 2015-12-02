#!/usr/bin/env coffee

ElasticQueue = require '../'

class CustomHandler
  constructor: (@config, @client) ->
    # do some setup?

  batchTask: (task, done) ->
    console.log task
    done(null, "all done", task)

  batchComplete: (err, resp, task) ->
    messages = []

    if resp?.items?
      resp.items.forEach (item) ->
        messages[item?.index?._id] = item

    if task?.batch?
      task.batch.forEach (item) ->
        item.callback(err, resp)

  close: () ->
    # do some cleanup


Queue = new ElasticQueue
  batchSize: 11
  rateLimit: 1000
  batchHandler: CustomHandler

Queue.on 'task', (batch)->
  console.log "task"

Queue.on 'batchComplete', (resp)->
  console.log "batch complete"

Queue.on 'drain', ->
  console.log "\n\nQueue is Empty\n\n"
  Queue.close()
  process.exit()

clone = (obj) ->
  JSON.parse JSON.stringify(obj)

document =
  index: 'elastic-product'
  type: 'queue'
  id: 0 # use hash of entire row as document id
  body:
    metadata: # header info about file
      fileName: 'inputFile'

document2 =
  index: 'elastic-product'
  type: 'queue'
  id: 0 # use hash of entire row as document id
  body:
    metadata: # header info about file
      fileName: [{ test:'inputFile' }]

i = 0
while i < 50
  d = clone document
  d.id = i++
  Queue.push d, (err, resp) ->
    return console.log err if err
    console.log "task complete", resp


d = document2
d.id = i++
Queue.push d, (err, resp) ->
  return console.log err if err
  console.log "task complete", resp
