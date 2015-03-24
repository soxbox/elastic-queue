#!/usr/bin/env coffee

ElasticQueue = require '../'

Queue = new ElasticQueue
  batchSize: 11
  rateLimit: 1000

Queue.on 'task', (batch)->
  console.log "task", batch

Queue.on 'batchComplete', (resp)->
  console.log "batch complete", resp

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


i = 0
while i < 50
  d = clone document
  d.id = i++
  Queue.push d

