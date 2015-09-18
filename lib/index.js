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

  ElasticQueue.prototype.push = function(task, callback) {
    if (callback == null) {
      callback = null;
    }
    return this.queue.push({
      task: task,
      callback: callback
    });
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

  ElasticQueue.prototype.batchComplete = function(err, resp, task) {
    var messages;
    messages = [];
    if (resp != null ? resp.items : void 0) {
      resp.items.forEach(function(item) {
        return messages[item.index._id] = item;
      });
    }
    task.batch.forEach(function(item) {
      var message;
      if (item.callback != null) {
        if (messages[item.task.id] != null) {
          message = messages[item.task.id];
          if ([200, 201].indexOf(message.index.status) > -1) {
            return item.callback(null, message);
          } else {
            return item.callback(new Error(message.index.error), message);
          }
        } else {
          return item.callback();
        }
      }
    });
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
          _index: value.task.index,
          _type: value.task.type,
          _id: value.task.id
        }
      });
      if (value.task.body != null) {
        index.push(value.task.body);
      }
    }
    return this.esClient.bulk({
      body: index
    }, function(err, res) {
      if (err) {
        return done(err, null, task);
      }
      return done(null, res, task);
    });
  };

  ElasticQueue.prototype.close = function() {
    return this.esClient.close();
  };

  return ElasticQueue;

})(events.EventEmitter);

module.exports = exports = ElasticQueue;

//# sourceMappingURL=data:application/json;base64,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OiJpbmRleC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbImVsYXN0aWNzZWFyY2ggPSByZXF1aXJlICdlbGFzdGljc2VhcmNoJ1xuSG9layA9IHJlcXVpcmUgJ2hvZWsnXG5hc3luYyA9IHJlcXVpcmUgJ2FzeW5jJ1xuZXZlbnRzID0gcmVxdWlyZSAnZXZlbnRzJ1xuXG5iYXNlQ29uZmlnID1cbiAgZWxhc3RpY3NlYXJjaDpcbiAgICBjbGllbnQ6XG4gICAgICBob3N0OiBcImxvY2FsaG9zdDo5MjAwXCJcbiAgICAgIGxvZzogXCJpbmZvXCJcbiAgICAgIG1pblNvY2tldHM6IDFcbiAgICAgIHNuaWZmSW50ZXJ2YWw6IDYwMDAwXG4gICAgICBzbmlmZk9uU3RhcnQ6IHRydWVcbiAgICAgIHN1Z2dlc3RDb21wcmVzc2lvbjogdHJ1ZVxuICBjb25jdXJlbmN5OiAxICMgbnVtYmVyIG9mIGFjdGl2ZSBiYXRjaGVzXG4gIGJhdGNoU2l6ZTogNTAwICMgYmF0Y2ggc2l6ZVxuICBjb21taXRUaW1lb3V0OiAxMDAwICMgd2FpdCB0aW1lIGJlZm9yZSBzZW5kaW5nIHBhcnRpYWwgYmF0Y2hlc1xuICByYXRlTGltaXQ6IDIwMDBcbiAgYmF0Y2hUeXBlOiBcImJhdGNoX3NpbmdsZVwiICMgYmF0Y2hfc2luZ2xlOiBjb252ZXJ0IHNpbmdsZXMgaW50byBiYXRjaGVzXG5cbmNsYXNzIEVsYXN0aWNRdWV1ZSBleHRlbmRzIGV2ZW50cy5FdmVudEVtaXR0ZXJcblxuICBjb25zdHJ1Y3RvcjogKGNvbmZpZyA9IHt9LCBlc0NsaWVudCkgLT5cbiAgICBAY29uZmlnID0gSG9lay5hcHBseVRvRGVmYXVsdHMgYmFzZUNvbmZpZywgY29uZmlnXG4gICAgQHF1ZXVlID0gW11cbiAgICBAY2hlY2tUaW1lciA9IHNldEludGVydmFsIEBjaGVjaywgQGNvbmZpZy5yYXRlTGltaXRcbiAgICBAYXN5bmMgPSBhc3luYy5xdWV1ZSBAdGFzaywgQGNvbmZpZy5jb25jdXJlbmN5XG4gICAgQGFzeW5jLmRyYWluID0gQGRyYWluXG4gICAgQGNvdW50ID0gMVxuICAgIGlmIGVzQ2xpZW50P1xuICAgICAgQGVzQ2xpZW50ID0gZXNDbGllbnRcbiAgICBlbHNlXG4gICAgICBAc2V0dXBfZWxhc3RpYygpXG5cbiAgZHJhaW46ID0+XG4gICAgaWYgQHF1ZXVlLmxlbmd0aCBpcyAwXG4gICAgICBAZW1pdCAnZHJhaW4nXG5cbiAgc2V0dXBfZWxhc3RpYzogLT5cbiAgICBAZXNDbGllbnQgPSBuZXcgZWxhc3RpY3NlYXJjaC5DbGllbnQgQGNvbmZpZy5lbGFzdGljc2VhcmNoLmNsaWVudFxuXG4gIHB1c2g6ICh0YXNrLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQHF1ZXVlLnB1c2ggeyB0YXNrOiB0YXNrLCBjYWxsYmFjazogY2FsbGJhY2sgfVxuXG4gIGNoZWNrOiA9PlxuICAgIGlmIEBxdWV1ZS5sZW5ndGggPiAwXG4gICAgICBAYmF0Y2goKVxuXG4gIGJhdGNoOiA9PlxuICAgIHNpemUgPSBAcXVldWUubGVuZ3RoXG4gICAgc2l6ZSA9IEBjb25maWcuYmF0Y2hTaXplIGlmIHNpemUgPj0gQGNvbmZpZy5iYXRjaFNpemVcblxuICAgIGlmIHNpemUgPiAwXG4gICAgICBAYXN5bmMucHVzaFxuICAgICAgICBiYXRjaDogQHF1ZXVlLnNwbGljZSgwLCBzaXplKVxuICAgICAgICBjb3VudDogQGNvdW50KyssXG4gICAgICAgIEBiYXRjaENvbXBsZXRlXG5cbiAgICBpZiBAcXVldWUubGVuZ3RoID4gMFxuICAgICAgY2xlYXJUaW1lb3V0IEBiYXRjaFRpbWVvdXRcbiAgICAgIEBiYXRjaFRpbWVvdXQgPVxuICAgICAgICBzZXRUaW1lb3V0IEBiYXRjaCwgQGNvbmZpZy5yYXRlTGltaXQgKyBAY29uZmlnLmNvbW1pdFRpbWVvdXRcblxuICBiYXRjaENvbXBsZXRlOiAoZXJyLCByZXNwLCB0YXNrKSA9PlxuICAgIG1lc3NhZ2VzID0gW11cblxuICAgIGlmIHJlc3A/Lml0ZW1zXG4gICAgICByZXNwLml0ZW1zLmZvckVhY2ggKGl0ZW0pIC0+XG4gICAgICAgIG1lc3NhZ2VzW2l0ZW0uaW5kZXguX2lkXSA9IGl0ZW1cblxuICAgIHRhc2suYmF0Y2guZm9yRWFjaCAoaXRlbSkgLT5cbiAgICAgIGlmIGl0ZW0uY2FsbGJhY2s/XG4gICAgICAgIGlmIG1lc3NhZ2VzW2l0ZW0udGFzay5pZF0/XG4gICAgICAgICAgbWVzc2FnZSA9IG1lc3NhZ2VzW2l0ZW0udGFzay5pZF1cbiAgICAgICAgICBpZiBbMjAwLCAyMDFdLmluZGV4T2YobWVzc2FnZS5pbmRleC5zdGF0dXMpID4gLTFcbiAgICAgICAgICAgIGl0ZW0uY2FsbGJhY2sobnVsbCwgbWVzc2FnZSlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBpdGVtLmNhbGxiYWNrKG5ldyBFcnJvcihtZXNzYWdlLmluZGV4LmVycm9yKSwgbWVzc2FnZSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGl0ZW0uY2FsbGJhY2soKVxuXG4gICAgcmV0dXJuIEBlbWl0KCdlcnJvcicsIGVycikgaWYgZXJyXG4gICAgQGVtaXQgJ2JhdGNoQ29tcGxldGUnLCByZXNwXG5cbiAgdGFzazogKHRhc2ssIGNhbGxiYWNrKSA9PlxuICAgIEBlbWl0ICd0YXNrJywgdGFza1xuICAgIEBbQGNvbmZpZy5iYXRjaFR5cGVdIHRhc2ssIGNhbGxiYWNrXG5cblxuICBiYXRjaF9zaW5nbGU6ICh0YXNrLCBkb25lKSA9PlxuICAgIGluZGV4ID0gW11cbiAgICBmb3Iga2V5LCB2YWx1ZSBvZiB0YXNrLmJhdGNoXG4gICAgICBpbmRleC5wdXNoXG4gICAgICAgIGluZGV4OlxuICAgICAgICAgIF9pbmRleDogdmFsdWUudGFzay5pbmRleFxuICAgICAgICAgIF90eXBlOiB2YWx1ZS50YXNrLnR5cGVcbiAgICAgICAgICBfaWQ6IHZhbHVlLnRhc2suaWRcbiAgICAgIGluZGV4LnB1c2ggdmFsdWUudGFzay5ib2R5IGlmIHZhbHVlLnRhc2suYm9keT9cblxuICAgIEBlc0NsaWVudC5idWxrIGJvZHk6IGluZGV4LCAoZXJyLCByZXMpIC0+XG4gICAgICByZXR1cm4gZG9uZShlcnIsIG51bGwsIHRhc2spIGlmIGVyclxuICAgICAgZG9uZShudWxsLCByZXMsIHRhc2spXG5cbiAgY2xvc2U6IC0+XG4gICAgQGVzQ2xpZW50LmNsb3NlKClcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gRWxhc3RpY1F1ZXVlXG4iXX0=