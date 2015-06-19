var ElasticQueue, Hoek, async, baseConfig, elasticsearch, events, exports,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

elasticsearch = require('elasticsearch');

Hoek = require('hoek');

async = require('async');

events = require('events');

baseConfig = {
  elasticsearch: {
    client: {
      host: "localhost:9200",
      log: "info",
      minSockets: 1,
      sniffInterval: 60000,
      sniffOnStart: true,
      suggestCompression: true
    }
  },
  concurency: 1,
  batchSize: 500,
  commitTimeout: 1000,
  rateLimit: 2000,
  batchType: "batch_single"
};

ElasticQueue = (function(superClass) {
  extend(ElasticQueue, superClass);

  function ElasticQueue(config, esClient) {
    if (config == null) {
      config = {};
    }
    this.batch_single = bind(this.batch_single, this);
    this.task = bind(this.task, this);
    this.batchComplete = bind(this.batchComplete, this);
    this.batch = bind(this.batch, this);
    this.check = bind(this.check, this);
    this.drain = bind(this.drain, this);
    this.config = Hoek.applyToDefaults(baseConfig, config);
    this.queue = [];
    this.checkTimer = setInterval(this.check, this.config.rateLimit);
    this.async = async.queue(this.task, this.config.concurency);
    this.async.drain = this.drain;
    this.count = 1;
    if (esClient != null) {
      this.esClient = esClient;
    } else {
      this.setup_elastic();
    }
  }

  ElasticQueue.prototype.drain = function() {
    if (this.queue.length === 0) {
      return this.emit('drain');
    }
  };

  ElasticQueue.prototype.setup_elastic = function() {
    return this.esClient = new elasticsearch.Client(this.config.elasticsearch.client);
  };

  ElasticQueue.prototype.push = function(item) {
    return this.queue.push(item);
  };

  ElasticQueue.prototype.check = function() {
    if (this.queue.length > 0) {
      return this.batch();
    }
  };

  ElasticQueue.prototype.batch = function() {
    var size;
    size = this.queue.length;
    if (size >= this.config.batchSize) {
      size = this.config.batchSize;
    }
    if (size > 0) {
      this.async.push({
        batch: this.queue.splice(0, size),
        count: this.count++
      }, this.batchComplete);
    }
    if (this.queue.length > 0) {
      clearTimeout(this.batchTimeout);
      return this.batchTimeout = setTimeout(this.batch, this.config.rateLimit + this.config.commitTimeout);
    }
  };

  ElasticQueue.prototype.batchComplete = function(err, resp) {
    if (err) {
      return this.emit('error', err);
    }
    return this.emit('batchComplete', resp);
  };

  ElasticQueue.prototype.task = function(task, callback) {
    this.emit('task', task);
    return this[this.config.batchType](task, callback);
  };

  ElasticQueue.prototype.batch_single = function(task, done) {
    var index, key, ref, value;
    index = [];
    ref = task.batch;
    for (key in ref) {
      value = ref[key];
      index.push({
        index: {
          _index: value.index,
          _type: value.type,
          _id: value.id
        }
      });
      if (value.body != null) {
        index.push(value.body);
      }
    }
    return this.esClient.bulk({
      body: index
    }, function(err, res) {
      if (err) {
        return done(err);
      }
      return done(null, res);
    });
  };

  ElasticQueue.prototype.close = function() {
    return this.esClient.close();
  };

  return ElasticQueue;

})(events.EventEmitter);

module.exports = exports = ElasticQueue;

//# sourceMappingURL=data:application/json;base64,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Ozt5QkFjZCxLQUFBLEdBQU8sU0FBQTtXQUNMLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBVixDQUFBO0VBREs7Ozs7R0FqRWtCLE1BQU0sQ0FBQzs7QUFvRWxDLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLE9BQUEsR0FBVSIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbImVsYXN0aWNzZWFyY2ggPSByZXF1aXJlICdlbGFzdGljc2VhcmNoJ1xuSG9layA9IHJlcXVpcmUgJ2hvZWsnXG5hc3luYyA9IHJlcXVpcmUgJ2FzeW5jJ1xuZXZlbnRzID0gcmVxdWlyZSAnZXZlbnRzJ1xuXG5iYXNlQ29uZmlnID1cbiAgZWxhc3RpY3NlYXJjaDpcbiAgICBjbGllbnQ6XG4gICAgICBob3N0OiBcImxvY2FsaG9zdDo5MjAwXCJcbiAgICAgIGxvZzogXCJpbmZvXCJcbiAgICAgIG1pblNvY2tldHM6IDFcbiAgICAgIHNuaWZmSW50ZXJ2YWw6IDYwMDAwXG4gICAgICBzbmlmZk9uU3RhcnQ6IHRydWVcbiAgICAgIHN1Z2dlc3RDb21wcmVzc2lvbjogdHJ1ZVxuICBjb25jdXJlbmN5OiAxICMgbnVtYmVyIG9mIGFjdGl2ZSBiYXRjaGVzXG4gIGJhdGNoU2l6ZTogNTAwICMgYmF0Y2ggc2l6ZVxuICBjb21taXRUaW1lb3V0OiAxMDAwICMgd2FpdCB0aW1lIGJlZm9yZSBzZW5kaW5nIHBhcnRpYWwgYmF0Y2hlc1xuICByYXRlTGltaXQ6IDIwMDBcbiAgYmF0Y2hUeXBlOiBcImJhdGNoX3NpbmdsZVwiICMgYmF0Y2hfc2luZ2xlOiBjb252ZXJ0IHNpbmdsZXMgaW50byBiYXRjaGVzXG5cbmNsYXNzIEVsYXN0aWNRdWV1ZSBleHRlbmRzIGV2ZW50cy5FdmVudEVtaXR0ZXJcblxuICBjb25zdHJ1Y3RvcjogKGNvbmZpZyA9IHt9LCBlc0NsaWVudCkgLT5cbiAgICBAY29uZmlnID0gSG9lay5hcHBseVRvRGVmYXVsdHMgYmFzZUNvbmZpZywgY29uZmlnXG4gICAgQHF1ZXVlID0gW11cbiAgICBAY2hlY2tUaW1lciA9IHNldEludGVydmFsIEBjaGVjaywgQGNvbmZpZy5yYXRlTGltaXRcbiAgICBAYXN5bmMgPSBhc3luYy5xdWV1ZSBAdGFzaywgQGNvbmZpZy5jb25jdXJlbmN5XG4gICAgQGFzeW5jLmRyYWluID0gQGRyYWluXG4gICAgQGNvdW50ID0gMVxuICAgIGlmIGVzQ2xpZW50P1xuICAgICAgQGVzQ2xpZW50ID0gZXNDbGllbnRcbiAgICBlbHNlXG4gICAgICBAc2V0dXBfZWxhc3RpYygpXG5cbiAgZHJhaW46ID0+XG4gICAgaWYgQHF1ZXVlLmxlbmd0aCBpcyAwXG4gICAgICBAZW1pdCAnZHJhaW4nXG5cbiAgc2V0dXBfZWxhc3RpYzogLT5cbiAgICBAZXNDbGllbnQgPSBuZXcgZWxhc3RpY3NlYXJjaC5DbGllbnQgQGNvbmZpZy5lbGFzdGljc2VhcmNoLmNsaWVudFxuXG4gIHB1c2g6IChpdGVtKSAtPlxuICAgIEBxdWV1ZS5wdXNoIGl0ZW1cblxuICBjaGVjazogPT5cbiAgICBpZiBAcXVldWUubGVuZ3RoID4gMFxuICAgICAgQGJhdGNoKClcblxuICBiYXRjaDogPT5cbiAgICBzaXplID0gQHF1ZXVlLmxlbmd0aFxuICAgIHNpemUgPSBAY29uZmlnLmJhdGNoU2l6ZSBpZiBzaXplID49IEBjb25maWcuYmF0Y2hTaXplXG5cbiAgICBpZiBzaXplID4gMFxuICAgICAgQGFzeW5jLnB1c2hcbiAgICAgICAgYmF0Y2g6IEBxdWV1ZS5zcGxpY2UoMCwgc2l6ZSlcbiAgICAgICAgY291bnQ6IEBjb3VudCsrLFxuICAgICAgICBAYmF0Y2hDb21wbGV0ZVxuXG4gICAgaWYgQHF1ZXVlLmxlbmd0aCA+IDBcbiAgICAgIGNsZWFyVGltZW91dCBAYmF0Y2hUaW1lb3V0XG4gICAgICBAYmF0Y2hUaW1lb3V0ID1cbiAgICAgICAgc2V0VGltZW91dCBAYmF0Y2gsIEBjb25maWcucmF0ZUxpbWl0ICsgQGNvbmZpZy5jb21taXRUaW1lb3V0XG5cbiAgYmF0Y2hDb21wbGV0ZTogKGVyciwgcmVzcCkgPT5cbiAgICByZXR1cm4gQGVtaXQoJ2Vycm9yJywgZXJyKSBpZiBlcnJcbiAgICBAZW1pdCAnYmF0Y2hDb21wbGV0ZScsIHJlc3BcblxuICB0YXNrOiAodGFzaywgY2FsbGJhY2spID0+XG4gICAgQGVtaXQgJ3Rhc2snLCB0YXNrXG4gICAgQFtAY29uZmlnLmJhdGNoVHlwZV0gdGFzaywgY2FsbGJhY2tcblxuICBiYXRjaF9zaW5nbGU6ICh0YXNrLCBkb25lKSA9PlxuICAgIGluZGV4ID0gW11cbiAgICBmb3Iga2V5LCB2YWx1ZSBvZiB0YXNrLmJhdGNoXG4gICAgICBpbmRleC5wdXNoXG4gICAgICAgIGluZGV4OlxuICAgICAgICAgIF9pbmRleDogdmFsdWUuaW5kZXhcbiAgICAgICAgICBfdHlwZTogdmFsdWUudHlwZVxuICAgICAgICAgIF9pZDogdmFsdWUuaWRcbiAgICAgIGluZGV4LnB1c2ggdmFsdWUuYm9keSBpZiB2YWx1ZS5ib2R5P1xuXG4gICAgQGVzQ2xpZW50LmJ1bGsgYm9keTogaW5kZXgsIChlcnIsIHJlcykgLT5cbiAgICAgIHJldHVybiBkb25lKGVycikgaWYgZXJyXG4gICAgICBkb25lKG51bGwsIHJlcylcblxuICBjbG9zZTogLT5cbiAgICBAZXNDbGllbnQuY2xvc2UoKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBFbGFzdGljUXVldWVcbiJdfQ==